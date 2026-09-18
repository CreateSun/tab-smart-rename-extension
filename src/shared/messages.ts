import type { EffectiveSource, RenameRule } from "../domain/types";

export type TabSnapshot = {
  tabId: number;
  url: string;
  hostname: string | null;
  originalTitle: string;
  effectiveName: string;
  source: EffectiveSource;
  restricted: boolean;
};

export type UiRequest =
  | { type: "GET_CURRENT" }
  | { type: "SAVE_NAME"; name: string; mode: "page" | "tab" | "permanent"; scope?: "exact-url" | "host"; traceId?: string }
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
  | { type: "OPEN_OPTIONS"; newRule?: { title: string; url: string }; ruleId?: string };

export type ContentRequest =
  | { type: "GET_PAGE_STATE" }
  | { type: "SET_PAGE_OVERRIDE"; name: string | null; suppress?: boolean }
  | { type: "APPLY_DECISION"; name: string | null; debounceMs: number }
  | { type: "CLEAR_DECISION" }
  | { type: "OPEN_RENAME_OVERLAY" };

export type ContentState = { originalTitle: string; pageOverride: { kind: "name"; name: string } | { kind: "suppress" } | null };
export type ContentEvent = { type: "PAGE_FACT_CHANGED" };
