import type { PageOverride, RenameRule, Resolution, TabOverride } from "./types";
import { interpolateUrlPatternName, matchUrlPattern, normalizeExactUrl, parseSupportedUrl } from "./url";

type ResolveInput = {
  rawUrl: string;
  originalTitle: string;
  pageOverride?: PageOverride | null;
  tabOverride?: TabOverride | null;
  rules: RenameRule[];
  pausedHosts: string[];
};

const newest = (rules: RenameRule[]): RenameRule | undefined =>
  [...rules].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];

export function resolveEffectiveName(input: ResolveInput): Resolution {
  const url = parseSupportedUrl(input.rawUrl);
  if (url && input.pausedHosts.includes(url.hostname.toLowerCase())) return { name: input.originalTitle, source: { kind: "paused" } };
  if (input.pageOverride?.kind === "suppress") return { name: input.originalTitle, source: { kind: "original" } };
  if (input.pageOverride?.kind === "name") return { name: input.pageOverride.name, source: { kind: "page" } };
  if (input.tabOverride) return { name: input.tabOverride.name, source: { kind: "tab" } };
  if (!url) return { name: input.originalTitle, source: { kind: "original" } };

  const normalizedUrl = normalizeExactUrl(input.rawUrl);
  const enabled = input.rules.filter((rule) => rule.enabled);
  const exact = newest(enabled.filter((rule) => rule.match.kind === "exact-url" && rule.match.value === normalizedUrl));
  if (exact) return { name: exact.name, source: { kind: "exact-url", matcher: exact.match.value, ruleId: exact.id } };
  const patternMatches = enabled.filter((rule) => rule.match.kind === "url-pattern").map((rule) => ({ rule, captures: matchUrlPattern(rule.match.value, input.rawUrl) })).filter((item): item is { rule: RenameRule & { match: { kind: "url-pattern"; value: string } }; captures: RegExpExecArray } => item.captures !== null);
  const pattern = newest(patternMatches.map((item) => item.rule));
  if (pattern) {
    const captures = patternMatches.find((item) => item.rule.id === pattern.id)!.captures;
    return { name: interpolateUrlPatternName(pattern.name, captures), source: { kind: "url-pattern", matcher: pattern.match.value, ruleId: pattern.id } };
  }
  const host = newest(enabled.filter((rule) => rule.match.kind === "host" && rule.match.value === url.hostname.toLowerCase()));
  if (host) return { name: host.name, source: { kind: "host", matcher: host.match.value, ruleId: host.id } };
  return { name: input.originalTitle, source: { kind: "original" } };
}
