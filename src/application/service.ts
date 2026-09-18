import { resolveEffectiveName } from "../domain/resolver";
import { DEFAULT_STATE, type PageOverride, type RenameRule, type StoredStateV1 } from "../domain/types";
import { isRestrictedUrl, normalizeExactUrl, parseSupportedUrl } from "../domain/url";
import { normalizeName, validateRule } from "../domain/validation";
import { exportRules, prepareImport, readSessionState, readStoredState, setTabOverride, updateStoredState, writeStoredState } from "../storage/state";
import type { ContentRequest, ContentState, TabSnapshot, UiRequest } from "../shared/messages";

async function activeTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("当前标签已关闭");
  return tab;
}

async function sendContent<T>(tabId: number, message: ContentRequest): Promise<T> {
  try {
    return await chrome.tabs.sendMessage(tabId, message) as T;
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
      return await chrome.tabs.sendMessage(tabId, message) as T;
    } catch {
      throw new Error("无法访问此页面。请刷新普通网页后重试");
    }
  }
}

async function pageState(tab: chrome.tabs.Tab): Promise<ContentState> {
  return sendContent<ContentState>(tab.id!, { type: "GET_PAGE_STATE" });
}

export async function resolveTab(tab: chrome.tabs.Tab, providedState?: StoredStateV1): Promise<TabSnapshot> {
  const state = providedState ?? await readStoredState();
  const rawUrl = tab.url ?? "";
  const restricted = isRestrictedUrl(rawUrl);
  if (restricted) return { tabId: tab.id!, url: rawUrl, hostname: null, originalTitle: tab.title ?? "", effectiveName: tab.title ?? "", source: { kind: "original" }, restricted: true };
  const content = await pageState(tab);
  const session = await readSessionState();
  const pageOverride: PageOverride | null = content.pageOverride ?? null;
  const resolution = resolveEffectiveName({ rawUrl, originalTitle: content.originalTitle, pageOverride, tabOverride: session.tabOverrides[String(tab.id!)] ?? null, rules: state.rules });
  await sendContent(tab.id!, { type: "APPLY_DECISION", name: resolution.source.kind === "original" ? null : resolution.name, debounceMs: state.settings.guardDebounceMs });
  const hostname = parseSupportedUrl(rawUrl)?.hostname.toLowerCase() ?? null;
  return { tabId: tab.id!, url: rawUrl, hostname, originalTitle: content.originalTitle, effectiveName: resolution.name ?? content.originalTitle, source: resolution.source, restricted: false };
}

async function refreshOpenTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({});
  const state = await readStoredState();
  await Promise.allSettled(tabs.filter((tab) => tab.id && tab.url && !isRestrictedUrl(tab.url)).map((tab) => resolveTab(tab, state)));
}

async function saveName(message: Extract<UiRequest, { type: "SAVE_NAME" }>): Promise<TabSnapshot> {
  const traceId = message.traceId;
  const log = (step: string, details: Record<string, unknown> = {}) => console.debug("[Tab Rename]", "save", step, { traceId, ...details });
  log("started", { mode: message.mode, scope: message.scope });
  const tab = await activeTab();
  log("active tab resolved", { tabId: tab.id });
  if (!tab.url || isRestrictedUrl(tab.url)) throw new Error("浏览器限制，无法修改此页面");
  const name = normalizeName(message.name);
  if (message.mode === "page") {
    await sendContent(tab.id!, { type: "SET_PAGE_OVERRIDE", name });
    log("page override saved");
  } else if (message.mode === "tab") {
    await sendContent(tab.id!, { type: "SET_PAGE_OVERRIDE", name: null });
    await setTabOverride(tab.id!, name);
    log("tab override saved");
  } else {
    const parsed = parseSupportedUrl(tab.url);
    if (!parsed) throw new Error("只有 http/https 页面可以创建永久规则");
    await sendContent(tab.id!, { type: "SET_PAGE_OVERRIDE", name: null });
    await setTabOverride(tab.id!, null);
    const match = message.scope === "host" ? { kind: "host" as const, value: parsed.hostname.toLowerCase() } : { kind: "exact-url" as const, value: normalizeExactUrl(tab.url)! };
    const now = new Date().toISOString();
    await updateStoredState((state) => {
      const existing = state.rules.find((rule) => rule.match.kind === match.kind && rule.match.value === match.value);
      if (existing) return { ...state, rules: state.rules.map((rule) => rule.id === existing.id ? { ...rule, name, enabled: true, updatedAt: now } : rule) };
      return { ...state, rules: [...state.rules, { id: crypto.randomUUID(), ruleName: name, name, match, enabled: true, createdAt: now, updatedAt: now }] };
    });
    log("permanent rule saved");
  }
  // The active tab has to respond before the overlay can close. Refreshing every
  // other open tab is best-effort work, so it must not hold that response hostage.
  void refreshOpenTabs().catch(() => undefined);
  const snapshot = await resolveTab(await chrome.tabs.get(tab.id!));
  log("completed", { source: snapshot.source.kind });
  return snapshot;
}

async function mutateRule(message: Extract<UiRequest, { type: "UPSERT_RULE" }>): Promise<void> {
  const traceId = message.traceId;
  const log = (step: string, details: Record<string, unknown> = {}) => console.debug("[Tab Rename]", "rule save", step, { traceId, ...details });
  log("started", { ruleId: message.rule.id, kind: message.rule.match.kind });
  const now = new Date().toISOString();
  await updateStoredState((state) => {
    log("storage state loaded", { ruleCount: state.rules.length });
    const existing = message.rule.id ? state.rules.find((rule) => rule.id === message.rule.id) : state.rules.find((rule) => rule.match.kind === message.rule.match.kind && rule.match.value === message.rule.match.value);
    const rule = validateRule({ id: existing?.id ?? crypto.randomUUID(), ruleName: message.rule.ruleName, name: message.rule.name, match: message.rule.match, enabled: message.rule.enabled ?? existing?.enabled ?? true, createdAt: existing?.createdAt ?? now, updatedAt: now });
    return { ...state, rules: existing ? state.rules.map((item) => item.id === existing.id ? rule : item) : [...state.rules, rule] };
  });
  log("storage write completed");
  // Rule management must respond as soon as the local write succeeds. A page that
  // does not answer its content-script message must not make the editor appear idle.
  void refreshOpenTabs().catch(() => undefined);
  log("completed; background refresh started");
}

export async function handleUiRequest(message: UiRequest): Promise<unknown> {
  if (message.type === "GET_CURRENT") return resolveTab(await activeTab());
  if (message.type === "SAVE_NAME") return saveName(message);
  if (message.type === "RESTORE_ORIGINAL" || message.type === "SUPPRESS_RULE") {
    const tab = await activeTab();
    const current = await resolveTab(tab);
    if (message.type === "SUPPRESS_RULE" || current.source.kind === "exact-url" || current.source.kind === "host") await sendContent(tab.id!, { type: "SET_PAGE_OVERRIDE", name: null, suppress: true });
    else if (current.source.kind === "tab") {
      await sendContent(tab.id!, { type: "SET_PAGE_OVERRIDE", name: null });
      await setTabOverride(tab.id!, null);
    } else await sendContent(tab.id!, { type: "SET_PAGE_OVERRIDE", name: null });
    return resolveTab(tab);
  }
  if (message.type === "LIST_STATE") return readStoredState();
  if (message.type === "UPSERT_RULE") return mutateRule(message);
  if (message.type === "TOGGLE_RULE") {
    await updateStoredState((state) => ({ ...state, rules: state.rules.map((rule) => rule.id === message.ruleId ? { ...rule, enabled: !rule.enabled, updatedAt: new Date().toISOString() } : rule) }));
    void refreshOpenTabs();
    return;
  }
  if (message.type === "DELETE_RULE") {
    await updateStoredState((state) => ({ ...state, rules: state.rules.filter((rule) => rule.id !== message.ruleId) }));
    void refreshOpenTabs();
    return;
  }
  if (message.type === "EXPORT_RULES") return exportRules();
  if (message.type === "IMPORT_RULES") {
    if (new Blob([message.json]).size > 1_048_576) throw new Error("导入文件不能超过 1 MiB");
    const current = await readStoredState();
    const preview = prepareImport(message.json, current.rules);
    await writeStoredState({ ...current, rules: preview.rules });
    await refreshOpenTabs();
    return { added: preview.added, updated: preview.updated, skipped: preview.skipped, errors: preview.errors };
  }
  if (message.type === "REQUEST_HOST_PERMISSION") return chrome.permissions.request({ origins: ["http://*/*", "https://*/*"] });
  if (message.type === "COMPLETE_ONBOARDING") return markOnboardingComplete();
  if (message.type === "OPEN_OPTIONS") {
    if (!message.newRule && !message.ruleId) return chrome.runtime.openOptionsPage();
    const parameters = new URLSearchParams();
    if (message.newRule) { parameters.set("newRule", "1"); parameters.set("title", message.newRule.title); parameters.set("url", message.newRule.url); }
    if (message.ruleId) parameters.set("ruleId", message.ruleId);
    return chrome.tabs.create({ url: chrome.runtime.getURL("options.html?" + parameters) });
  }
  return structuredClone(DEFAULT_STATE);
}

export async function markOnboardingComplete(): Promise<void> {
  await updateStoredState((state) => ({ ...state, settings: { ...state.settings, onboardingCompleted: true } }));
}

export async function removeClosedTab(tabId: number): Promise<void> { await setTabOverride(tabId, null); }
export { refreshOpenTabs };
