// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RenameOverlay } from "../src/content/overlay";

const snapshot = { tabId: 1, url: "https://example.com/work", hostname: "example.com", originalTitle: "Original page", effectiveName: "Original page", source: { kind: "original" }, restricted: false, paused: false };

describe("rename overlay", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = "<head><title>Page</title></head><body></body>";
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
    (chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: snapshot });
  });

  it("opens once in a closed shadow root and focuses the name field", async () => {
    const overlay = new RenameOverlay();
    await overlay.open();
    await overlay.open();
    const host = document.querySelector("#tab-smart-rename-overlay-host");
    expect(host).not.toBeNull();
    expect(host?.shadowRoot).toBeNull();
    expect(document.querySelectorAll("#tab-smart-rename-overlay-host")).toHaveLength(1);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape after the exit animation", async () => {
    vi.useFakeTimers();
    const overlay = new RenameOverlay();
    await overlay.open();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await vi.advanceTimersByTimeAsync(300);
    expect(document.querySelector("#tab-smart-rename-overlay-host")).toBeNull();
    vi.useRealTimers();
  });
});
