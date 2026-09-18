import { describe, expect, it } from "vitest";
import { resolveEffectiveName } from "../src/domain/resolver";
import type { RenameRule } from "../src/domain/types";
import { normalizeExactUrl, normalizeHostname } from "../src/domain/url";

const rule = (kind: "exact-url" | "url-pattern" | "host", value: string, name: string, updatedAt = "2026-09-16T00:00:00.000Z", enabled = true): RenameRule => ({ id: `${kind}-${name}`, ruleName: name, name, match: { kind, value } as RenameRule["match"], enabled, createdAt: updatedAt, updatedAt });
const base = { rawUrl: "https://example.com/work?a=1#part", originalTitle: "Original", rules: [] as RenameRule[] };

describe("URL normalization", () => {
  it("removes fragments while preserving path and query", () => expect(normalizeExactUrl(base.rawUrl)).toBe("https://example.com/work?a=1"));
  it("normalizes host names without widening subdomains", () => { expect(normalizeHostname("HTTPS://EXAMPLE.COM/path")).toBe("example.com"); expect(normalizeHostname("sub.example.com")).toBe("sub.example.com"); });
  it("rejects unsupported protocols", () => expect(normalizeExactUrl("chrome://settings")).toBeNull());
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
});
