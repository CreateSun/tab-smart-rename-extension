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
    await vi.advanceTimersByTimeAsync(130);
    expect(document.querySelector("#tab-smart-rename-overlay-host")).toBeNull();
    vi.useRealTimers();
  });

  it("re-enables save when the background does not respond", async () => {
    vi.useFakeTimers();
    (chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>).mockImplementation((message: { type: string }) => {
      if (message.type === "GET_CURRENT") return Promise.resolve({ ok: true, data: snapshot });
      if (message.type === "SAVE_NAME") return new Promise(() => undefined);
      return Promise.resolve({ ok: true });
    });
    const overlay = new RenameOverlay();
    await overlay.open();
    const privateOverlay = overlay as unknown as { shadow: ShadowRoot };
    const form = privateOverlay.shadow.querySelector("form")!;
    const submit = privateOverlay.shadow.querySelector<HTMLButtonElement>(".submit")!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(submit.textContent).toBe("正在保存…");
    await vi.advanceTimersByTimeAsync(8_000);
    expect(submit.disabled).toBe(false);
    expect(submit.textContent).toBe("保存 ↵");
    expect(privateOverlay.shadow.querySelector(".error")?.textContent).toBe("保存超时，请重试");
    vi.useRealTimers();
  });

  it("opens the source rule in the options editor", async () => {
    const ruleSnapshot = { ...snapshot, source: { kind: "url-pattern" as const, matcher: "https://example.com/.*", ruleId: "rule-42" } };
    (chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: ruleSnapshot });
    const overlay = new RenameOverlay();
    await overlay.open();
    const privateOverlay = overlay as unknown as { shadow: ShadowRoot };
    (privateOverlay.shadow.querySelector(".source") as HTMLElement).click();
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "OPEN_OPTIONS", ruleId: "rule-42" });
  });

});
