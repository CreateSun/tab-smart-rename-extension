import { describe, expect, it } from "vitest";
import { resolveEffectiveName } from "../src/domain/resolver";
import type { RenameRule } from "../src/domain/types";
import { normalizeExactUrl, normalizeHostname } from "../src/domain/url";

const rule = (kind: "exact-url" | "host", value: string, name: string, updatedAt = "2026-09-16T00:00:00.000Z", enabled = true): RenameRule => ({ id: `${kind}-${name}`, name, match: { kind, value } as RenameRule["match"], enabled, createdAt: updatedAt, updatedAt });
const base = { rawUrl: "https://example.com/work?a=1#part", originalTitle: "Original", rules: [] as RenameRule[], pausedHosts: [] as string[] };

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
  it("selects the most recently updated duplicate and honors pause/suppress", () => {
    const rules = [rule("host", "example.com", "Old"), rule("host", "example.com", "New", "2026-09-17T00:00:00.000Z")];
    expect(resolveEffectiveName({ ...base, rules }).name).toBe("New");
    expect(resolveEffectiveName({ ...base, rules, pageOverride: { kind: "suppress" } }).source.kind).toBe("original");
    expect(resolveEffectiveName({ ...base, rules, pausedHosts: ["example.com"], pageOverride: { kind: "name", name: "Page" } }).source.kind).toBe("paused");
  });
});
