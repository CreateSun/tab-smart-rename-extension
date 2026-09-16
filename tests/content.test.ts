// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("content title guard", () => {
  beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); document.documentElement.innerHTML = "<head><title>Original</title></head><body></body>"; location.hash = ""; });
  it("captures the original title and restores a custom decision without a polling loop", async () => {
    await import("../src/content/index");
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0]?.[0] as Function;
    let state: unknown; listener({ type: "GET_PAGE_STATE" }, {}, (value: unknown) => { state = value; });
    expect(state).toMatchObject({ originalTitle: "Original" });
    listener({ type: "APPLY_DECISION", name: "Pinned", debounceMs: 150 }, {}, () => {});
    expect(document.title).toBe("Pinned");
    document.title = "Unread (2)"; await vi.advanceTimersByTimeAsync(160); expect(document.title).toBe("Pinned");
    vi.useRealTimers();
  });
  it("clears a page override and requests re-resolution after SPA navigation", async () => {
    await import("../src/content/index");
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0]?.[0] as Function;
    listener({ type: "SET_PAGE_OVERRIDE", name: "Temporary" }, {}, () => {});
    history.pushState({}, "", "/next");
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "PAGE_FACT_CHANGED" });
    let state: unknown; listener({ type: "GET_PAGE_STATE" }, {}, (value: unknown) => { state = value; });
    expect(state).toMatchObject({ pageOverride: null });
    vi.useRealTimers();
  });
});
