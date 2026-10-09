import { describe, expect, it } from "vitest";
import { DEFAULT_STATE } from "../src/domain/types";

describe("language state contract", () => {
  it("defaults new installations to English", () => {
    expect(DEFAULT_STATE.settings.language).toBe("en");
  });

  it("keeps the supported language values intentionally narrow", () => {
    const supported = ["en", "zh_CN"] as const;
    expect(supported).toContain(DEFAULT_STATE.settings.language);
  });
});
