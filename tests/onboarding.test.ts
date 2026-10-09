// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const page = `<!doctype html><html><head></head><body>
<img class="brand-mark" src="icons/icon-32.png"><div id="language-toggle"><button data-language="en"></button><button data-language="zh_CN"></button></div>
<span id="shortcutLabel"></span><p id="shortcutStatus"></p><span id="localOnly"></span><span id="installed"></span><h1 id="headline"></h1><p id="lead"></p><p id="webpageTip"></p><span id="shortcutFastest"></span><span id="privacyNote"></span>
<p id="demoEyebrow"></p><h2 id="demoTitle"></h2><p id="demoHelp"></p><span id="demoAlt"></span><div data-demo="rename-flow" role="img"><img src="onboarding/demo-original-favicon.svg"><span id="demoTabOriginal"></span><span id="demoTabRenamed"></span><span id="demoInputOriginal"></span><span id="demoInputRenamed"></span><span id="demoOverlayTitle"></span><span id="demoNameLabel"></span><span id="demoSource"></span><span id="demoOriginal"></span><span id="demoPersistence"></span><span id="demoScope"></span><span id="demoRestore"></span><span id="demoSave"></span><span id="demoStatus"></span></div>
<h2 id="stepsTitle"></h2><section id="steps"><article><strong id="step1"></strong><p id="step1Help"></p></article><article><strong id="step2"></strong><p id="step2Help"></p></article><article><strong id="step3"></strong><p id="step3Help"></p></article></section><button id="checkShortcut"></button><button id="googleTest"></button><button id="start"></button>
</body></html>`;

describe("onboarding localization", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = page;
    Object.assign(chrome, { commands: { getAll: vi.fn().mockResolvedValue([{ name: "_execute_action", shortcut: "Ctrl+Shift+R" }]) }, tabs: { create: vi.fn(), getCurrent: vi.fn(), remove: vi.fn() } });
    vi.resetModules();
  });

  it("loads English by default and sets document language", async () => {
    (chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: { settings: { language: "en" } } });
    await import("../src/ui/onboarding");
    await vi.waitFor(() => expect(document.documentElement.lang).toBe("en"));
    expect(document.querySelector("#step1")?.textContent).toBe("Open the rename overlay");
    expect(document.querySelectorAll("#steps article")).toHaveLength(3);
    expect(document.querySelector("#stepsTitle")?.textContent).toBe("How to use");
    expect(document.querySelector("[data-demo=rename-flow]")).toBeTruthy();
    expect(document.querySelector("[data-demo=rename-flow] img")?.getAttribute("src")).toBe("onboarding/demo-original-favicon.svg");
  });

  it("loads Chinese from LIST_STATE", async () => {
    (chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: { settings: { language: "zh_CN" } } });
    await import("../src/ui/onboarding");
    await vi.waitFor(() => expect(document.documentElement.lang).toBe("zh-CN"));
    expect(document.querySelector("#step1")?.textContent).toBe("打开重命名浮层");
    expect(document.querySelector("#shortcutLabel")?.textContent).toBe("Ctrl+Shift+R");
  });

  it("switches language globally and keeps compact labels", async () => {
    (chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: { settings: { language: "en" } } });
    await import("../src/ui/onboarding");
    await vi.waitFor(() => expect(document.documentElement.lang).toBe("en"));
    (document.querySelector('[data-language="zh_CN"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "SET_LANGUAGE", language: "zh_CN" }));
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(document.querySelector('[data-language="en"]')?.textContent).toBe("EN");
    expect(document.querySelector('[data-language="zh_CN"]')?.textContent).toBe("中文");
    expect(document.querySelector("#stepsTitle")?.textContent).toBe("使用步骤");
    expect(document.querySelectorAll("#steps article")).toHaveLength(3);
    expect(document.querySelector("#step3")?.textContent).toBe("回到工作");
    expect(document.querySelector("#demoTitle")?.textContent).toBe("几秒内完成命名和恢复");
    expect(document.querySelector("#demoRestore")?.textContent).toBe("恢复原标题");
    expect(document.querySelector("#demoTabRenamed")?.textContent).toBe("项目跟进");
    expect(document.querySelector("#demoInputOriginal")?.textContent).toBe("收件箱 — 邮件");
  });

  it("shows an unassigned shortcut and opens Google for a real-page test", async () => {
    (chrome.commands.getAll as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ name: "_execute_action", shortcut: "", description: "" }]);
    (chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: { settings: { language: "en" } } });
    await import("../src/ui/onboarding");
    await vi.waitFor(() => expect(document.querySelector("#shortcutLabel")?.textContent).toBe("Not assigned"));
    expect(document.querySelector("#shortcutStatus")?.classList.contains("needs-action")).toBe(true);
    (document.querySelector("#googleTest") as HTMLButtonElement).click();
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: "https://www.google.com/" });
  });
});
