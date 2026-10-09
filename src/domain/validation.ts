import { MAX_ICON_CODE_POINTS, MAX_NAME_CODE_POINTS, type RenameRule } from "./types";
import { normalizeExactUrl, normalizeHostname, normalizeUrlPattern } from "./url";
import type { Language } from "./types";
import { translate, type MessageKey } from "../shared/i18n";

export class ValidationError extends Error {
  constructor(public readonly key: MessageKey, public readonly params: Record<string, string | number> = {}, language: Language = "en") {
    super(translate(language, key, params));
    this.name = "ValidationError";
  }
}

export function normalizeName(name: unknown, language: Language = "en"): string {
  if (typeof name !== "string") throw new ValidationError("error.nameNotText", {}, language);
  const normalized = name.trim();
  const length = Array.from(normalized).length;
  if (length === 0) throw new ValidationError("error.nameEmpty", {}, language);
  if (length > MAX_NAME_CODE_POINTS) throw new ValidationError("error.nameTooLong", { max: MAX_NAME_CODE_POINTS }, language);
  return normalized;
}

export function normalizeIcon(icon: unknown, language: Language = "en"): string | null {
  if (icon === undefined || icon === null || icon === "") return null;
  if (typeof icon !== "string") throw new ValidationError("error.iconNotText", {}, language);
  const normalized = icon.trim();
  if (!normalized) return null;
  if (Array.from(normalized).length > MAX_ICON_CODE_POINTS) throw new ValidationError("error.iconTooLong", { max: MAX_ICON_CODE_POINTS }, language);
  return normalized;
}

export function validateRule(input: unknown, language: Language = "en"): RenameRule {
  if (!input || typeof input !== "object") throw new ValidationError("error.ruleObject", {}, language);
  const item = input as Partial<RenameRule>;
  if (typeof item.id !== "string" || !item.id) throw new ValidationError("error.ruleId", {}, language);
  if (typeof item.enabled !== "boolean") throw new ValidationError("error.ruleEnabled", {}, language);
  if (typeof item.createdAt !== "string" || !Number.isFinite(Date.parse(item.createdAt))) throw new ValidationError("error.createdAt", {}, language);
  if (typeof item.updatedAt !== "string" || !Number.isFinite(Date.parse(item.updatedAt))) throw new ValidationError("error.updatedAt", {}, language);
  if (!item.match || typeof item.match !== "object") throw new ValidationError("error.matcher", {}, language);

  const name = normalizeName(item.name, language);
  const icon = normalizeIcon(item.icon, language);
  // Rules saved before rule names were introduced keep a readable label.
  const ruleName = normalizeName(item.ruleName ?? name, language);
  const match = item.match;
  if (match.kind === "exact-url") {
    const value = normalizeExactUrl(match.value);
    if (!value) throw new ValidationError("error.exactUrl", {}, language);
    return { id: item.id, ruleName, name, icon, match: { kind: "exact-url", value }, enabled: item.enabled, createdAt: item.createdAt, updatedAt: item.updatedAt };
  }
  if (match.kind === "url-pattern") {
    const value = normalizeUrlPattern(match.value);
    if (!value) throw new ValidationError("error.urlPattern", {}, language);
    return { id: item.id, ruleName, name, icon, match: { kind: "url-pattern", value }, enabled: item.enabled, createdAt: item.createdAt, updatedAt: item.updatedAt };
  }
  if (match.kind === "host") {
    const value = normalizeHostname(match.value);
    if (!value || value.includes("/")) throw new ValidationError("error.host", {}, language);
    return { id: item.id, ruleName, name, icon, match: { kind: "host", value }, enabled: item.enabled, createdAt: item.createdAt, updatedAt: item.updatedAt };
  }
  throw new ValidationError("error.matcherKind", {}, language);
}
