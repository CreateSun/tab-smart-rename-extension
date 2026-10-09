import type { PageOverride, RenameRule, Resolution, TabOverride } from "./types";
import { interpolateUrlPatternName, matchUrlPattern, normalizeExactUrl, normalizeHostname, normalizeUrlPattern, parseSupportedUrl } from "./url";

export type RulePreviewInput = {
  kind: "exact-url" | "url-pattern" | "host";
  value: string;
  name: string;
  rawUrl: string;
};

export type RulePreviewResult =
  | { status: "matched"; name: string }
  | { status: "unmatched" }
  | { status: "invalid"; reason: "target-url" | "match-value" | "name" };

export function previewRule(input: RulePreviewInput): RulePreviewResult {
  const normalizedTargetUrl = normalizeExactUrl(input.rawUrl);
  if (!normalizedTargetUrl) return { status: "invalid", reason: "target-url" };
  if (input.kind === "exact-url") {
    const expected = normalizeExactUrl(input.value);
    if (!expected) return { status: "invalid", reason: "match-value" };
    if (!input.name.trim()) return { status: "invalid", reason: "name" };
    return expected === normalizedTargetUrl ? { status: "matched", name: input.name.trim() } : { status: "unmatched" };
  }
  if (input.kind === "url-pattern") {
    const pattern = normalizeUrlPattern(input.value);
    if (!pattern) return { status: "invalid", reason: "match-value" };
    if (!input.name.trim()) return { status: "invalid", reason: "name" };
    const captures = matchUrlPattern(pattern, input.rawUrl);
    return captures ? { status: "matched", name: interpolateUrlPatternName(input.name.trim(), captures) } : { status: "unmatched" };
  }
  const expected = normalizeHostname(input.value);
  const actual = parseSupportedUrl(input.rawUrl)?.hostname.toLowerCase();
  if (!expected || expected.includes("/") || !actual) return { status: "invalid", reason: "match-value" };
  if (!input.name.trim()) return { status: "invalid", reason: "name" };
  return expected === actual ? { status: "matched", name: input.name.trim() } : { status: "unmatched" };
}

type ResolveInput = {
  rawUrl: string;
  originalTitle: string;
  originalIcon?: string | null;
  pageOverride?: PageOverride | null;
  tabOverride?: TabOverride | null;
  rules: RenameRule[];
};

export function resolveEffectiveName(input: ResolveInput): Resolution {
  const originalIcon = input.originalIcon ?? null;
  if (input.pageOverride?.kind === "suppress") return { name: input.originalTitle, source: { kind: "original" }, effectiveIcon: null, originalIcon };
  if (input.pageOverride?.kind === "name") return { name: input.pageOverride.name, source: { kind: "page" }, effectiveIcon: input.pageOverride.icon ?? null, originalIcon };
  if (input.tabOverride) return { name: input.tabOverride.name, source: { kind: "tab" }, effectiveIcon: input.tabOverride.icon ?? null, originalIcon };
  const url = parseSupportedUrl(input.rawUrl);
  if (!url) return { name: input.originalTitle, source: { kind: "original" }, effectiveIcon: null, originalIcon };

  const normalizedUrl = normalizeExactUrl(input.rawUrl);
  const enabled = input.rules.filter((rule) => rule.enabled);
  const exact = enabled.find((rule) => rule.match.kind === "exact-url" && rule.match.value === normalizedUrl);
  if (exact) return { name: exact.name, source: { kind: "exact-url", matcher: exact.match.value, ruleId: exact.id }, effectiveIcon: exact.icon ?? null, originalIcon };
  for (const rule of enabled) {
    if (rule.match.kind !== "url-pattern") continue;
    const captures = matchUrlPattern(rule.match.value, input.rawUrl);
    if (!captures) continue;
    return { name: interpolateUrlPatternName(rule.name, captures), source: { kind: "url-pattern", matcher: rule.match.value, ruleId: rule.id }, effectiveIcon: rule.icon ?? null, originalIcon };
  }
  const host = enabled.find((rule) => rule.match.kind === "host" && rule.match.value === url.hostname.toLowerCase());
  if (host) return { name: host.name, source: { kind: "host", matcher: host.match.value, ruleId: host.id }, effectiveIcon: host.icon ?? null, originalIcon };
  return { name: input.originalTitle, source: { kind: "original" }, effectiveIcon: null, originalIcon };
}
