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
  it("applies an emoji favicon and explicitly reasserts the webpage favicon when restored", async () => {
    vi.useFakeTimers();
    document.head.insertAdjacentHTML("beforeend", '<link rel="icon" href="/favicon.ico">');
    await import("../src/content/index");
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0]?.[0] as Function;
    listener({ type: "APPLY_DECISION", name: "Pinned", icon: "🚀", debounceMs: 150 }, {}, () => {});
    const injected = document.querySelector<HTMLLinkElement>('link[data-tab-rename-icon="1"]');
    expect(injected?.href).toContain("data:image/svg+xml");
    expect(injected?.href).toContain(encodeURIComponent("🚀"));
    let state: unknown; listener({ type: "GET_PAGE_STATE" }, {}, (value: unknown) => { state = value; });
    expect(state).toMatchObject({ originalIcon: expect.stringContaining("/favicon.ico") });
    listener({ type: "CLEAR_DECISION" }, {}, () => {});
    expect(document.querySelector('link[data-tab-rename-icon="1"]')).toBeNull();
    expect(document.querySelector<HTMLLinkElement>('link[data-tab-rename-restore-icon="1"]')?.href).toContain("/favicon.ico");
    await vi.advanceTimersByTimeAsync(260);
    expect(document.querySelector('link[data-tab-rename-restore-icon="1"]')).toBeNull();
    expect(document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.href).toContain("/favicon.ico");
    vi.useRealTimers();
  });
  it("restores Chrome's known favicon when the page has no explicit icon link", async () => {
    vi.useFakeTimers();
    await import("../src/content/index");
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0]?.[0] as Function;
    listener({ type: "APPLY_DECISION", name: "Pinned", icon: "🚀", originalIcon: "https://example.com/favicon.ico", debounceMs: 150 }, {}, () => {});
    listener({ type: "CLEAR_DECISION" }, {}, () => {});
    expect(document.querySelector<HTMLLinkElement>('link[data-tab-rename-restore-icon="1"]')?.href).toBe("https://example.com/favicon.ico");
    await vi.advanceTimersByTimeAsync(260);
    vi.useRealTimers();
  });
});
