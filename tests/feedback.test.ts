import { beforeEach, describe, expect, it } from "vitest";
import { FEEDBACK_FORM_URL, feedbackUrl } from "../src/shared/feedback";

describe("feedback links", () => {
  beforeEach(() => {
    delete (chrome.runtime as unknown as Record<string, unknown>).getManifest;
  });

  it("tags each entry point with its source", () => {
    expect(feedbackUrl("options_footer")).toBe(`${FEEDBACK_FORM_URL}?source=options_footer`);
  });

  it("adds the extension version for triage when available", () => {
    (chrome.runtime as unknown as Record<string, unknown>).getManifest = () => ({ version: "0.1.3" });
    expect(feedbackUrl("uninstall")).toBe(`${FEEDBACK_FORM_URL}?source=uninstall&v=0.1.3`);
  });

  it("only carries the entry source and version", () => {
    const parameters = new URL(feedbackUrl("onboarding_footer")).searchParams;
    expect(parameters.toString()).toBe("source=onboarding_footer");
  });
});
