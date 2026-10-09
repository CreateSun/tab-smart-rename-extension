import { describe, expect, it } from "vitest";
import { prepareImport } from "../src/storage/state";
import type { RenameRule } from "../src/domain/types";
import { validateRule } from "../src/domain/validation";

const existing: RenameRule = { id: "one", ruleName: "Existing rule", name: "Old", match: { kind: "host", value: "example.com" }, enabled: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
describe("atomic import preparation", () => {
  it("rejects structural errors before producing a commit", () => { expect(() => prepareImport("not json", [])).toThrow(); expect(() => prepareImport(JSON.stringify({ schemaVersion: 2, rules: [] }), [])).toThrow("Import file version is unsupported"); });
  it("keeps valid rows, reports invalid rows, and resolves newer conflicts", () => {
    const incoming = { ...existing, id: "two", name: "New", updatedAt: "2026-02-01T00:00:00.000Z" };
    const result = prepareImport(JSON.stringify({ schemaVersion: 1, rules: [incoming, { nope: true }] }), [existing]);
    expect(result.updated).toBe(1); expect(result.errors).toHaveLength(1); expect(result.rules[0]?.name).toBe("New");
  });
  it("keeps legacy rules without icons and validates icon size", () => {
    expect(validateRule(existing).icon).toBeNull();
    expect(validateRule({ ...existing, icon: "🚀" }).icon).toBe("🚀");
    expect(() => validateRule({ ...existing, icon: "123456789" })).toThrow("Icon cannot exceed 8 characters");
  });
});
