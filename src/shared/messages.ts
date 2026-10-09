import type { EffectiveSource, RenameRule } from "../domain/types";
import type { Language } from "../domain/types";

export type TabSnapshot = {
  tabId: number;
  url: string;
  hostname: string | null;
  originalTitle: string;
  effectiveName: string;
  effectiveIcon: string | null;
  originalIcon: string | null;
  source: EffectiveSource;
  restricted: boolean;
};

export type UiRequest =
  | { type: "GET_CURRENT" }
  | { type: "SAVE_NAME"; name: string; icon?: string | null; mode: "page" | "tab" | "permanent"; scope?: "exact-url" | "host"; traceId?: string }
  | { type: "RESTORE_ORIGINAL" }
  | { type: "SUPPRESS_RULE" }
  | { type: "LIST_STATE" }
  | { type: "UPSERT_RULE"; rule: Partial<RenameRule> & Pick<RenameRule, "ruleName" | "name" | "match">; traceId?: string }
  | { type: "TOGGLE_RULE"; ruleId: string }
  | { type: "DELETE_RULE"; ruleId: string }
  | { type: "EXPORT_RULES" }
  | { type: "IMPORT_RULES"; json: string }
  | { type: "REQUEST_HOST_PERMISSION" }
  | { type: "COMPLETE_ONBOARDING" }
  | { type: "SET_LANGUAGE"; language: Language }
  | { type: "OPEN_OPTIONS"; newRule?: { title: string; url: string }; ruleId?: string };

export type ContentRequest =
  | { type: "GET_PAGE_STATE" }
  | { type: "SET_PAGE_OVERRIDE"; name: string | null; icon?: string | null; suppress?: boolean }
  | { type: "APPLY_DECISION"; name: string | null; icon?: string | null; originalIcon?: string | null; debounceMs: number }
  | { type: "CLEAR_DECISION" }
  | { type: "OPEN_RENAME_OVERLAY" };

export type ContentState = { originalTitle: string; originalIcon: string | null; pageOverride: { kind: "name"; name: string; icon?: string | null } | { kind: "suppress"; icon?: string | null } | null };
export type ContentEvent = { type: "PAGE_FACT_CHANGED" };
