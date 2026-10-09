// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RenameOverlay } from "../src/content/overlay";

const snapshot = { tabId: 1, url: "https://example.com/work", hostname: "example.com", originalTitle: "Original page", effectiveName: "Original page", effectiveIcon: null, originalIcon: "https://example.com/favicon.ico", source: { kind: "original" }, restricted: false };

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
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(2);
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
    expect(submit.textContent).toBe("Saving…");
    await vi.advanceTimersByTimeAsync(8_000);
    expect(submit.disabled).toBe(false);
    expect(submit.textContent).toBe("Save ↵");
    expect(privateOverlay.shadow.querySelector(".error")?.textContent).toBe("Saving timed out. Please try again");
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

  it("renders the overlay in the stored Chinese language", async () => {
    (chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>).mockImplementation((message: { type: string }) => {
      if (message.type === "LIST_STATE") return Promise.resolve({ ok: true, data: { settings: { language: "zh_CN" } } });
      return Promise.resolve({ ok: true, data: snapshot });
    });
    const overlay = new RenameOverlay();
    await overlay.open();
    const shadow = (overlay as unknown as { shadow: ShadowRoot }).shadow;
    expect(shadow.querySelector("#rename-title")?.textContent).toBe("重命名当前标签");
    expect(shadow.querySelector(".submit")?.textContent).toContain("保存");
    expect(shadow.querySelector(".loading")?.textContent).toBe("加载中…");
    expect(shadow.querySelector(".permission-faq strong")?.textContent).toBe("配置了全局规则后不生效？");
  });

  it("saves a permanent rule after permission denial and keeps a danger explanation visible", async () => {
    (chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>).mockImplementation((message: { type: string }) => {
      if (message.type === "LIST_STATE") return Promise.resolve({ ok: true, data: { settings: { language: "en" } } });
      if (message.type === "GET_CURRENT") return Promise.resolve({ ok: true, data: snapshot });
      if (message.type === "REQUEST_HOST_PERMISSION") return Promise.resolve({ ok: true, data: false });
      return Promise.resolve({ ok: true, data: snapshot });
    });
    const overlay = new RenameOverlay();
    await overlay.open();
    const shadow = (overlay as unknown as { shadow: ShadowRoot }).shadow;
    (shadow.querySelector<HTMLInputElement>('input[name="mode"][value="permanent"]')!).click();
    (shadow.querySelector("form") as HTMLFormElement).dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "SAVE_NAME", mode: "permanent" })));
    await vi.waitFor(() => expect(shadow.querySelector(".error")?.textContent).toContain("Other tabs cannot apply it automatically"));
    expect(shadow.querySelector(".error")?.classList.contains("danger")).toBe(true);
    expect(shadow.querySelector(".error")?.getAttribute("role")).toBe("alert");
    expect(document.querySelector("#tab-smart-rename-overlay-host")).not.toBeNull();
  });

  it("selects an emoji and includes it in the save payload", async () => {
    const overlay = new RenameOverlay();
    await overlay.open();
    const shadow = (overlay as unknown as { shadow: ShadowRoot }).shadow;
    (shadow.querySelector(".icon-picker") as HTMLButtonElement).click();
    (shadow.querySelector('[data-icon="🚀"]') as HTMLButtonElement).click();
    (shadow.querySelector("form") as HTMLFormElement).dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "SAVE_NAME", icon: "🚀" })));
  });

  it("switches language from the header without reopening and keeps the draft name", async () => {
    const overlay = new RenameOverlay();
    await overlay.open();
    const read = () => (overlay as unknown as { shadow: ShadowRoot }).shadow;
    expect(read().querySelector("#rename-title")?.textContent).toBe("Rename this tab");
    read().querySelector<HTMLInputElement>("#rename-input")!.value = "Draft name";
    read().querySelector<HTMLInputElement>('input[name="mode"][value="permanent"]')!.checked = true;
    (read().querySelector('.lang-option[data-language="zh_CN"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "SET_LANGUAGE", language: "zh_CN" }));
    expect(read().querySelector("#rename-title")?.textContent).toBe("重命名当前标签");
    expect(read().querySelector(".submit")?.textContent).toContain("保存");
    expect(read().querySelector<HTMLInputElement>("#rename-input")?.value).toBe("Draft name");
    expect(read().querySelector<HTMLInputElement>('input[name="mode"][value="permanent"]')?.checked).toBe(true);
    expect(read().querySelector<HTMLElement>(".scope")?.hidden).toBe(false);
    expect(read().querySelector('.lang-option[data-language="zh_CN"]')?.getAttribute("aria-pressed")).toBe("true");
    (read().querySelector('.lang-option[data-language="en"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(read().querySelector("#rename-title")?.textContent).toBe("Rename this tab"));
  });

  it("shows the webpage favicon by default and tracks picker expansion", async () => {
    const overlay = new RenameOverlay();
    await overlay.open();
    const shadow = (overlay as unknown as { shadow: ShadowRoot }).shadow;
    expect((shadow.querySelector(".icon-preview") as HTMLImageElement).src).toBe(snapshot.originalIcon);
    const picker = shadow.querySelector(".icon-picker") as HTMLButtonElement;
    picker.click();
    expect(picker.getAttribute("aria-expanded")).toBe("true");
    (shadow.querySelector('[data-icon="🚀"]') as HTMLButtonElement).click();
    expect(picker.getAttribute("aria-expanded")).toBe("false");
  });

});
