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
  if (restricted) return { tabId: tab.id!, url: rawUrl, hostname: null, originalTitle: tab.title ?? "", effectiveName: tab.title ?? "", source: { kind: "original" }, restricted: true, paused: false };
  const content = await pageState(tab);
  const session = await readSessionState();
  const pageOverride: PageOverride | null = content.pageOverride ?? null;
  const resolution = resolveEffectiveName({ rawUrl, originalTitle: content.originalTitle, pageOverride, tabOverride: session.tabOverrides[String(tab.id!)] ?? null, rules: state.rules, pausedHosts: state.pausedHosts });
  await sendContent(tab.id!, { type: "APPLY_DECISION", name: resolution.source.kind === "original" || resolution.source.kind === "paused" ? null : resolution.name, debounceMs: state.settings.guardDebounceMs });
  const hostname = parseSupportedUrl(rawUrl)?.hostname.toLowerCase() ?? null;
  return { tabId: tab.id!, url: rawUrl, hostname, originalTitle: content.originalTitle, effectiveName: resolution.name ?? content.originalTitle, source: resolution.source, restricted: false, paused: hostname ? state.pausedHosts.includes(hostname) : false };
}

async function refreshOpenTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({});
  const state = await readStoredState();
  await Promise.allSettled(tabs.filter((tab) => tab.id && tab.url && !isRestrictedUrl(tab.url)).map((tab) => resolveTab(tab, state)));
}

async function saveName(message: Extract<UiRequest, { type: "SAVE_NAME" }>): Promise<TabSnapshot> {
  const tab = await activeTab();
  if (!tab.url || isRestrictedUrl(tab.url)) throw new Error("浏览器限制，无法修改此页面");
  const name = normalizeName(message.name);
  if (message.mode === "page") {
    await sendContent(tab.id!, { type: "SET_PAGE_OVERRIDE", name });
  } else if (message.mode === "tab") {
    await sendContent(tab.id!, { type: "SET_PAGE_OVERRIDE", name: null });
    await setTabOverride(tab.id!, name);
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
      return { ...state, rules: [...state.rules, { id: crypto.randomUUID(), name, match, enabled: true, createdAt: now, updatedAt: now }] };
    });
  }
  await refreshOpenTabs();
  return resolveTab(await chrome.tabs.get(tab.id!));
}

async function mutateRule(message: Extract<UiRequest, { type: "UPSERT_RULE" }>): Promise<void> {
  const now = new Date().toISOString();
  await updateStoredState((state) => {
    const existing = message.rule.id ? state.rules.find((rule) => rule.id === message.rule.id) : state.rules.find((rule) => rule.match.kind === message.rule.match.kind && rule.match.value === message.rule.match.value);
    const rule = validateRule({ id: existing?.id ?? crypto.randomUUID(), name: message.rule.name, match: message.rule.match, enabled: message.rule.enabled ?? existing?.enabled ?? true, createdAt: existing?.createdAt ?? now, updatedAt: now });
    return { ...state, rules: existing ? state.rules.map((item) => item.id === existing.id ? rule : item) : [...state.rules, rule] };
  });
  await refreshOpenTabs();
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
    return refreshOpenTabs();
  }
  if (message.type === "DELETE_RULE") {
    await updateStoredState((state) => ({ ...state, rules: state.rules.filter((rule) => rule.id !== message.ruleId) }));
    return refreshOpenTabs();
  }
  if (message.type === "TOGGLE_HOST") {
    await updateStoredState((state) => ({ ...state, pausedHosts: state.pausedHosts.includes(message.hostname) ? state.pausedHosts.filter((host) => host !== message.hostname) : [...state.pausedHosts, message.hostname] }));
    return refreshOpenTabs();
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
  return structuredClone(DEFAULT_STATE);
}

export async function markOnboardingComplete(): Promise<void> {
  await updateStoredState((state) => ({ ...state, settings: { ...state.settings, onboardingCompleted: true } }));
}

export async function removeClosedTab(tabId: number): Promise<void> { await setTabOverride(tabId, null); }
export { refreshOpenTabs };
