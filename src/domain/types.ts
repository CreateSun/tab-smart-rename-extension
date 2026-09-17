export const SCHEMA_VERSION = 1 as const;
export const MAX_NAME_CODE_POINTS = 256;
export const MAX_RULES = 5_000;

export type ExactUrlMatch = { kind: "exact-url"; value: string };
export type UrlPatternMatch = { kind: "url-pattern"; value: string };
export type HostMatch = { kind: "host"; value: string };
export type RuleMatch = ExactUrlMatch | UrlPatternMatch | HostMatch;

export type RenameRule = {
  id: string;
  ruleName: string;
  name: string;
  match: RuleMatch;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StoredStateV1 = {
  schemaVersion: typeof SCHEMA_VERSION;
  rules: RenameRule[];
  pausedHosts: string[];
  settings: { guardDebounceMs: number; onboardingCompleted: boolean };
};

export type TabOverride = { name: string; createdAt: string };
export type SessionState = { tabOverrides: Record<string, TabOverride> };

export type PageOverride =
  | { kind: "name"; name: string }
  | { kind: "suppress" };

export type EffectiveSource =
  | { kind: "page" }
  | { kind: "tab" }
  | { kind: "exact-url"; matcher: string; ruleId: string }
  | { kind: "url-pattern"; matcher: string; ruleId: string }
  | { kind: "host"; matcher: string; ruleId: string }
  | { kind: "original" }
  | { kind: "paused" };

export type Resolution = { name: string | null; source: EffectiveSource };

export const DEFAULT_STATE: StoredStateV1 = {
  schemaVersion: SCHEMA_VERSION,
  rules: [],
  pausedHosts: [],
  settings: { guardDebounceMs: 150, onboardingCompleted: false }
};
