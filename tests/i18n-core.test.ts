import { beforeEach, describe, expect, it, vi } from "vitest";
import { MESSAGES, translate } from "../src/shared/i18n";
import { normalizeName } from "../src/domain/validation";
import { readStoredState } from "../src/storage/state";

describe("core i18n contract", () => {
  it("keeps the English and Chinese dictionaries exactly aligned", () => {
    expect(Object.keys(MESSAGES.zh_CN).sort()).toEqual(Object.keys(MESSAGES.en).sort());
  });

  it("interpolates parameters and preserves unknown placeholders", () => {
    expect(translate("en", "error.nameTooLong", { max: 256 })).toBe("Name cannot exceed 256 characters");
    expect(translate("zh_CN", "error.importRow", { index: 2, message: "坏规则" })).toBe("第 2 条：坏规则");
    expect(translate("en", "options.preview", { kind: "Domain", value: "example.com", name: "Work" })).toContain("Work");
  });

  it("localizes validation failures by language", () => {
    expect(() => normalizeName("", "en")).toThrow("Name cannot be empty");
    expect(() => normalizeName("", "zh_CN")).toThrow("名称不能为空");
  });
});

describe("stored language migration", () => {
  const get = vi.fn();
  const set = vi.fn();
  beforeEach(() => {
    get.mockReset(); set.mockReset();
    Object.assign(globalThis.chrome, { storage: { local: { get, set }, session: { get: vi.fn(), set: vi.fn() } } });
  });

  it("migrates missing and invalid language to English", async () => {
    get.mockResolvedValue({ storedState: { schemaVersion: 1, rules: [], settings: { guardDebounceMs: 150, onboardingCompleted: false } } });
    expect((await readStoredState()).settings.language).toBe("en");
    get.mockResolvedValue({ storedState: { schemaVersion: 1, rules: [], settings: { guardDebounceMs: 150, onboardingCompleted: false, language: "fr" } } });
    expect((await readStoredState()).settings.language).toBe("en");
  });

  it("retains a valid Chinese language", async () => {
    get.mockResolvedValue({ storedState: { schemaVersion: 1, rules: [], settings: { guardDebounceMs: 150, onboardingCompleted: false, language: "zh_CN" } } });
    expect((await readStoredState()).settings.language).toBe("zh_CN");
  });
});
