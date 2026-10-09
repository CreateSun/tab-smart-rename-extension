import { DEFAULT_STATE, MAX_RULES, SCHEMA_VERSION, type RenameRule, type SessionState, type StoredStateV1 } from "../domain/types";
import { validateRule } from "../domain/validation";
import { normalizeLanguage, translate } from "../shared/i18n";

const LOCAL_KEY = "storedState";
const SESSION_KEY = "sessionState";

function validateStoredState(value: unknown): StoredStateV1 {
  if (!value || typeof value !== "object") return structuredClone(DEFAULT_STATE);
  const state = value as Partial<StoredStateV1>;
  const language = normalizeLanguage(state.settings && typeof state.settings === "object" ? (state.settings as { language?: unknown }).language : undefined);
  if (state.schemaVersion !== SCHEMA_VERSION) throw new Error(translate(language, "error.storageVersion"));
  if (!Array.isArray(state.rules) || !state.settings) throw new Error(translate(language, "error.storageShape"));
  if (state.rules.length > MAX_RULES) throw new Error(translate(language, "error.maxRules"));
  return {
    schemaVersion: SCHEMA_VERSION,
    rules: state.rules.map((rule) => validateRule(rule, language)),
    settings: {
      guardDebounceMs: typeof state.settings.guardDebounceMs === "number" ? Math.min(250, Math.max(100, state.settings.guardDebounceMs)) : 150,
      onboardingCompleted: state.settings.onboardingCompleted === true,
      language
    }
  };
}

export async function readStoredState(): Promise<StoredStateV1> {
  const result = await chrome.storage.local.get(LOCAL_KEY);
  return validateStoredState(result[LOCAL_KEY]);
}

export async function writeStoredState(state: StoredStateV1): Promise<void> {
  const validated = validateStoredState(state);
  await chrome.storage.local.set({ [LOCAL_KEY]: validated });
}

export async function updateStoredState(mutator: (state: StoredStateV1) => StoredStateV1): Promise<StoredStateV1> {
  const next = validateStoredState(mutator(await readStoredState()));
  await writeStoredState(next);
  return next;
}

export async function readSessionState(): Promise<SessionState> {
  const result = await chrome.storage.session.get(SESSION_KEY);
  const value = result[SESSION_KEY] as Partial<SessionState> | undefined;
  return value?.tabOverrides && typeof value.tabOverrides === "object" ? { tabOverrides: value.tabOverrides } : { tabOverrides: {} };
}

export async function writeSessionState(state: SessionState): Promise<void> {
  await chrome.storage.session.set({ [SESSION_KEY]: state });
}

export async function setTabOverride(tabId: number, name: string | null, icon?: string | null): Promise<void> {
  const state = await readSessionState();
  if (name === null) delete state.tabOverrides[String(tabId)];
  else state.tabOverrides[String(tabId)] = { name, icon, createdAt: new Date().toISOString() };
  await writeSessionState(state);
}

export async function exportRules(): Promise<string> {
  const { rules } = await readStoredState();
  return JSON.stringify({ schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), rules }, null, 2);
}

export type ImportPreview = { rules: RenameRule[]; added: number; updated: number; skipped: number; errors: string[] };

export function prepareImport(json: string, currentRules: RenameRule[], language: "en" | "zh_CN" = "en"): ImportPreview {
  let value: unknown;
  try { value = JSON.parse(json); } catch { throw new Error(translate(language, "error.invalidJson")); }
  if (!value || typeof value !== "object") throw new Error(translate(language, "error.importShape"));
  const envelope = value as { schemaVersion?: unknown; rules?: unknown };
  if (envelope.schemaVersion !== SCHEMA_VERSION) throw new Error(translate(language, "error.importVersion"));
  if (!Array.isArray(envelope.rules)) throw new Error(translate(language, "error.importRulesMissing"));
  if (envelope.rules.length > MAX_RULES) throw new Error(translate(language, "error.importMaxRules", { max: MAX_RULES }));

  const byMatcher = new Map(currentRules.map((rule) => [`${rule.match.kind}:${rule.match.value}`, rule]));
  let added = 0, updated = 0, skipped = 0;
  const errors: string[] = [];
  envelope.rules.forEach((input, index) => {
    try {
      const incoming = validateRule(input, language);
      const key = `${incoming.match.kind}:${incoming.match.value}`;
      const existing = byMatcher.get(key);
      if (!existing) { byMatcher.set(key, incoming); added += 1; }
      else if (Date.parse(incoming.updatedAt) > Date.parse(existing.updatedAt)) { byMatcher.set(key, incoming); updated += 1; }
      else skipped += 1;
    } catch (error) {
      errors.push(translate(language, "error.importRow", { index: index + 1, message: error instanceof Error ? error.message : translate(language, "error.invalidRule") }));
    }
  });
  return { rules: [...byMatcher.values()], added, updated, skipped, errors };
}
