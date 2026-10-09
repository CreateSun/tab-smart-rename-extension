import { describe, expect, it } from "vitest";
import { previewRule, resolveEffectiveName } from "../src/domain/resolver";
import type { RenameRule } from "../src/domain/types";
import { matchUrlPattern, normalizeExactUrl, normalizeHostname } from "../src/domain/url";

const rule = (kind: "exact-url" | "url-pattern" | "host", value: string, name: string, updatedAt = "2026-09-16T00:00:00.000Z", enabled = true, icon?: string | null): RenameRule => ({ id: `${kind}-${name}`, ruleName: name, name, icon, match: { kind, value } as RenameRule["match"], enabled, createdAt: updatedAt, updatedAt });
const base = { rawUrl: "https://example.com/work?a=1#part", originalTitle: "Original", rules: [] as RenameRule[] };

describe("URL normalization", () => {
  it("removes fragments while preserving path and query", () => expect(normalizeExactUrl(base.rawUrl)).toBe("https://example.com/work?a=1"));
  it("normalizes host names without widening subdomains", () => { expect(normalizeHostname("HTTPS://EXAMPLE.COM/path")).toBe("example.com"); expect(normalizeHostname("sub.example.com")).toBe("sub.example.com"); });
  it("rejects unsupported protocols", () => expect(normalizeExactUrl("chrome://settings")).toBeNull());
});

describe("rule preview", () => {
  const preview = { kind: "exact-url" as const, value: "https://example.com/work", name: "Work", rawUrl: "https://example.com/work" };

  it("reports the invalid preview field without throwing", () => {
    expect(previewRule({ ...preview, rawUrl: "not-a-url" })).toEqual({ status: "invalid", reason: "target-url" });
    expect(previewRule({ ...preview, value: "not-a-url" })).toEqual({ status: "invalid", reason: "match-value" });
    expect(previewRule({ ...preview, name: "" })).toEqual({ status: "invalid", reason: "name" });
  });

  it("previews a multi-segment capture with interpolation", () => {
    expect(previewRule({ kind: "url-pattern", value: "https://example.com/app/{1*}", name: "App $1", rawUrl: "https://example.com/app/one/two" })).toEqual({ status: "matched", name: "App one/two" });
  });
});

describe("effective name resolver", () => {
  it("uses page, tab, exact URL, host, then original priority", () => {
    const rules = [rule("host", "example.com", "Host"), rule("exact-url", "https://example.com/work?a=1", "Exact")];
    expect(resolveEffectiveName({ ...base, rules }).name).toBe("Exact");
    expect(resolveEffectiveName({ ...base, rules, tabOverride: { name: "Tab", createdAt: "now" } }).name).toBe("Tab");
    expect(resolveEffectiveName({ ...base, rules, tabOverride: { name: "Tab", createdAt: "now" }, pageOverride: { kind: "name", name: "Page" } }).name).toBe("Page");
  });
  it("matches host exactly and ignores disabled rules", () => {
    const rules = [rule("host", "example.com", "Host"), rule("exact-url", "https://example.com/work?a=1", "Disabled", undefined, false)];
    expect(resolveEffectiveName({ ...base, rules, rawUrl: "https://sub.example.com/work?a=1" }).name).toBe("Original");
    expect(resolveEffectiveName({ ...base, rules }).name).toBe("Host");
  });
  it("uses URL regex captures in a name template", () => {
    const rules = [rule("url-pattern", "https://captain.release.ctripcorp.com/app/{1}/*", "{1}")];
    const result = resolveEffectiveName({ ...base, rawUrl: "https://captain.release.ctripcorp.com/app/platform/deployments", rules });
    expect(result.name).toBe("platform");
    expect(result.source.kind).toBe("url-pattern");
  });
  it("resolves the Ares corp module pattern with both captured path segments", () => {
    const rules = [rule("url-pattern", "https://home.ares.ctripcorp.com/panel/module/corp/{1}/{2}", "$1 $2")];
    const result = resolveEffectiveName({
      ...base,
      rawUrl: "https://home.ares.ctripcorp.com/panel/module/corp/cyk-ui-pc/2.91.2",
      rules,
    });
    expect(result.name).toBe("cyk-ui-pc 2.91.2");
    expect(result.source.kind).toBe("url-pattern");
  });
  it("captures multiple path segments with the explicit wide capture token", () => {
    const rules = [rule("url-pattern", "https://home.ares.ctripcorp.com/panel/module/corp/{1*}", "$1 / {1}")];
    const result = resolveEffectiveName({
      ...base,
      rawUrl: "https://home.ares.ctripcorp.com/panel/module/corp/cyk-ui-pc/2.91.2",
      rules,
    });
    expect(result.name).toBe("cyk-ui-pc/2.91.2 / cyk-ui-pc/2.91.2");
  });
  it("keeps the legacy capture-plus-wildcard syntax single-segment", () => {
    expect(matchUrlPattern("https://example.com/app/{1}*", "https://example.com/app/alpha/beta")).toBeNull();
    expect(matchUrlPattern("https://example.com/app/{1}*", "https://example.com/app/alpha-beta")).not.toBeNull();
  });
  it("does not let a wide capture consume query or hash delimiters", () => {
    const captures = matchUrlPattern("https://example.com/app/{1*}?view=full", "https://example.com/app/alpha/beta?view=full#details");
    expect(captures?.[1]).toBe("alpha/beta");
  });
  it("escapes URL special chars in {n} patterns (query strings)", () => {
    const rules = [rule("url-pattern", "https://iquality.ctripcorp.com/feedback/feedbackForMeHandle?pid={1}&v={2}", "IQ-$1-$2")];
    const result = resolveEffectiveName({ ...base, rawUrl: "https://iquality.ctripcorp.com/feedback/feedbackForMeHandle?pid=7&v=1789613231843", rules });
    expect(result.name).toBe("IQ-7-1789613231843");
    expect(result.source.kind).toBe("url-pattern");
  });
  it("supports standard regex capture groups and dollar templates", () => {
    const rules = [rule("url-pattern", "https://example\\.com/projects/([^/]+)(?:/.*)?", "Project: " + "\$1")];
    expect(resolveEffectiveName({ ...base, rawUrl: "https://example.com/projects/alpha/issues", rules }).name).toBe("Project: alpha");
  });
  it("uses first matching rule among duplicates and honors suppress", () => {
    const rules = [rule("host", "example.com", "First"), rule("host", "example.com", "Second", "2026-09-17T00:00:00.000Z")];
    expect(resolveEffectiveName({ ...base, rules }).name).toBe("First");
    expect(resolveEffectiveName({ ...base, rules, pageOverride: { kind: "suppress" } }).source.kind).toBe("original");
  });
  it("follows priority: exact-url > url-pattern > host", () => {
    const rules = [
      rule("host", "example.com", "Host"),
      rule("url-pattern", "https://example.com/work?a={1}", "Pattern-$1"),
      rule("exact-url", "https://example.com/work?a=1", "Exact"),
    ];
    expect(resolveEffectiveName({ ...base, rules }).name).toBe("Exact");
    expect(resolveEffectiveName({ ...base, rawUrl: "https://example.com/work?a=2", rules }).name).toBe("Pattern-2");
    expect(resolveEffectiveName({ ...base, rawUrl: "https://example.com/other", rules }).name).toBe("Host");
  });
  it("keeps the original favicon separate from an optional icon override", () => {
    const originalIcon = "https://example.com/favicon.ico";
    const legacy = resolveEffectiveName({ ...base, originalIcon, rules: [rule("host", "example.com", "Host")] });
    expect(legacy).toMatchObject({ effectiveIcon: null, originalIcon });
    const overridden = resolveEffectiveName({ ...base, originalIcon, rules: [rule("host", "example.com", "Host", undefined, true, "🚀")] });
    expect(overridden).toMatchObject({ effectiveIcon: "🚀", originalIcon });
  });
});
