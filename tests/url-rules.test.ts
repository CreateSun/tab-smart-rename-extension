// URL rule regression suite.
// Cases live in tests/fixtures/url-rules.json, which is also a valid export file:
// import it from the options page ("Import JSON") to black-box test the same rules
// in Chrome. Any change to URL parsing/matching must keep every case passing.
import { describe, expect, it } from "vitest";
import { previewRule, resolveEffectiveName } from "../src/domain/resolver";
import type { RenameRule } from "../src/domain/types";
import { prepareImport } from "../src/storage/state";
import rawFixture from "./fixtures/url-rules.json";

type RuleCase = { url: string; rule: string | null; name?: string; note?: string };

const fixture = rawFixture as unknown as { rules: RenameRule[]; cases: RuleCase[] };
const json = JSON.stringify(rawFixture);
const ORIGINAL = "Original title";

describe("URL rule fixture", () => {
  it("imports cleanly through the same path as the options page", () => {
    const result = prepareImport(json, []);
    expect(result.errors).toEqual([]);
    expect(result.added).toBe(fixture.rules.length);
  });

  it("covers every enabled rule with at least one matching case", () => {
    const covered = new Set(fixture.cases.map((item) => item.rule));
    const uncovered = fixture.rules.filter((rule) => rule.enabled && !covered.has(rule.ruleName)).map((rule) => rule.ruleName);
    expect(uncovered).toEqual([]);
  });

  it("references only rules that exist in the fixture", () => {
    const names = new Set(fixture.rules.map((rule) => rule.ruleName));
    expect(fixture.cases.filter((item) => item.rule !== null && !names.has(item.rule)).map((item) => item.rule)).toEqual([]);
  });
});

describe("URL rule cases", () => {
  // Use the imported (validated/normalized) rules, exactly as the extension stores them.
  const rules = prepareImport(json, []).rules;
  const byId = new Map(rules.map((rule) => [rule.id, rule]));

  it.each(fixture.cases.map((item) => [`${item.rule ?? "no rule"} ← ${item.url}`, item] as const))("%s", (_title, item) => {
    const result = resolveEffectiveName({ rawUrl: item.url, originalTitle: ORIGINAL, rules });
    const matched = "ruleId" in result.source ? byId.get(result.source.ruleId)?.ruleName ?? null : null;
    expect({ rule: matched, name: result.name }, item.note).toEqual({ rule: item.rule, name: item.rule === null ? ORIGINAL : item.name });

    // The options page "Test rule" panel must agree with the runtime resolver.
    if (item.rule !== null) {
      const rule = rules.find((candidate) => candidate.ruleName === item.rule)!;
      expect(previewRule({ kind: rule.match.kind, value: rule.match.value, name: rule.name, rawUrl: item.url }), item.note).toEqual({ status: "matched", name: item.name });
    }
  });
});
