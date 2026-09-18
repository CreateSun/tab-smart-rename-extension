import type { PageOverride, RenameRule, Resolution, TabOverride } from "./types";
import { interpolateUrlPatternName, matchUrlPattern, normalizeExactUrl, parseSupportedUrl } from "./url";

type ResolveInput = {
  rawUrl: string;
  originalTitle: string;
  pageOverride?: PageOverride | null;
  tabOverride?: TabOverride | null;
  rules: RenameRule[];
};

export function resolveEffectiveName(input: ResolveInput): Resolution {
  if (input.pageOverride?.kind === "suppress") return { name: input.originalTitle, source: { kind: "original" } };
  if (input.pageOverride?.kind === "name") return { name: input.pageOverride.name, source: { kind: "page" } };
  if (input.tabOverride) return { name: input.tabOverride.name, source: { kind: "tab" } };
  const url = parseSupportedUrl(input.rawUrl);
  if (!url) return { name: input.originalTitle, source: { kind: "original" } };

  const normalizedUrl = normalizeExactUrl(input.rawUrl);
  const enabled = input.rules.filter((rule) => rule.enabled);
  const exact = enabled.find((rule) => rule.match.kind === "exact-url" && rule.match.value === normalizedUrl);
  if (exact) return { name: exact.name, source: { kind: "exact-url", matcher: exact.match.value, ruleId: exact.id } };
  for (const rule of enabled) {
    if (rule.match.kind !== "url-pattern") continue;
    const captures = matchUrlPattern(rule.match.value, input.rawUrl);
    if (!captures) continue;
    return { name: interpolateUrlPatternName(rule.name, captures), source: { kind: "url-pattern", matcher: rule.match.value, ruleId: rule.id } };
  }
  const host = enabled.find((rule) => rule.match.kind === "host" && rule.match.value === url.hostname.toLowerCase());
  if (host) return { name: host.name, source: { kind: "host", matcher: host.match.value, ruleId: host.id } };
  return { name: input.originalTitle, source: { kind: "original" } };
}
