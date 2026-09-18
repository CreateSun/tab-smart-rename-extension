// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_STATE } from "../src/domain/types";

const page = '<input id="search"><button id="add"></button><button id="rule-help"></button><p id="status"></p><div id="rules"></div><button id="permission"></button><button id="export"></button><input id="import" type="file"><div id="rule-dialog" hidden><form id="rule-form"><input id="rule-id"><h2 id="rule-dialog-title"></h2><select id="rule-kind"><option value="exact-url">URL</option><option value="host">Host</option></select><input id="rule-value"><input id="rule-label"><input id="rule-name"><p id="rule-preview"></p><p id="rule-error"></p><button id="rule-close" type="button"></button><button id="rule-form-help" type="button"></button><button id="rule-cancel" type="button"></button><button type="submit">创建规则</button></form></div><div id="rule-help-dialog" hidden><button id="rule-help-close" type="button"></button><button id="rule-help-done" type="button"></button></div>';

describe("rule editor", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = page;
    history.replaceState(null, "", "/options.html");
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(async (message) => {
      if ((message as unknown as { type: string }).type === "LIST_STATE") return { ok: true, data: structuredClone(DEFAULT_STATE) };
      return { ok: true };
    });
  });

  it("creates a host rule through one custom form", async () => {
    await import("../src/ui/options");
    await vi.waitFor(() => expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "LIST_STATE" }));
    (document.querySelector("#add") as HTMLButtonElement).click();
    expect((document.querySelector("#rule-dialog") as HTMLElement).hidden).toBe(false);
    const kind = document.querySelector("#rule-kind") as HTMLSelectElement;
    kind.value = "host";
    kind.dispatchEvent(new Event("change"));
    const value = document.querySelector("#rule-value") as HTMLInputElement;
    value.value = "example.com";
    const label = document.querySelector("#rule-label") as HTMLInputElement;
    label.value = "Example site";
    const name = document.querySelector("#rule-name") as HTMLInputElement;
    name.value = "Example";
    document.querySelector("#rule-form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "UPSERT_RULE",
      traceId: expect.any(String),
      rule: { id: undefined, ruleName: "Example site", name: "Example", match: { kind: "host", value: "example.com" } }
    })));
    await vi.waitFor(() => {
      expect((document.querySelector("#rule-dialog") as HTMLElement).hidden).toBe(true);
      expect((document.querySelector("#status") as HTMLElement).textContent).toBe("规则已保存");
    });
  });

  it("opens a form prefilled from the new-rule URL", async () => {
    history.replaceState(null, "", "/options.html?newRule=1&title=Example%20page&url=https%3A%2F%2Fexample.com%2Fwork");
    await import("../src/ui/options");
    await vi.waitFor(() => expect((document.querySelector("#rule-dialog") as HTMLElement).hidden).toBe(false));
    expect((document.querySelector("#rule-value") as HTMLInputElement).value).toBe("https://example.com/work");
    expect((document.querySelector("#rule-name") as HTMLInputElement).value).toBe("Example page");
  });

  it("requires a rule name before saving", async () => {
    await import("../src/ui/options");
    (document.querySelector("#add") as HTMLButtonElement).click();
    (document.querySelector("#rule-value") as HTMLInputElement).value = "https://example.com/work";
    (document.querySelector("#rule-name") as HTMLInputElement).value = "Example page";
    document.querySelector("#rule-form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect((document.querySelector("#rule-error") as HTMLElement).textContent).toBe("请填写规则名称、过滤内容和新标签名称。");
  });

  it("opens rule help and closes it with Escape", async () => {
    await import("../src/ui/options");
    (document.querySelector("#rule-help") as HTMLButtonElement).click();
    expect((document.querySelector("#rule-help-dialog") as HTMLElement).hidden).toBe(false);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect((document.querySelector("#rule-help-dialog") as HTMLElement).hidden).toBe(true);
  });

  it("opens rule help from the rule editor", async () => {
    await import("../src/ui/options");
    (document.querySelector("#add") as HTMLButtonElement).click();
    (document.querySelector("#rule-form-help") as HTMLButtonElement).click();
    expect((document.querySelector("#rule-help-dialog") as HTMLElement).hidden).toBe(false);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect((document.querySelector("#rule-help-dialog") as HTMLElement).hidden).toBe(true);
    expect((document.querySelector("#rule-dialog") as HTMLElement).hidden).toBe(false);
  });

  it("restores the save button when the rule request times out", async () => {
    vi.useFakeTimers();
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(async (message) => {
      if ((message as unknown as { type: string }).type === "LIST_STATE") return { ok: true, data: structuredClone(DEFAULT_STATE) };
      if ((message as unknown as { type: string }).type === "UPSERT_RULE") return new Promise(() => undefined);
      return { ok: true };
    });
    await import("../src/ui/options");
    await vi.runAllTicks();
    (document.querySelector("#add") as HTMLButtonElement).click();
    (document.querySelector("#rule-value") as HTMLInputElement).value = "example.com";
    (document.querySelector("#rule-label") as HTMLInputElement).value = "Example site";
    (document.querySelector("#rule-name") as HTMLInputElement).value = "Example";
    const submit = document.querySelector("#rule-form button[type=submit]") as HTMLButtonElement;
    document.querySelector("#rule-form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(submit.textContent).toBe("正在保存…");
    await vi.advanceTimersByTimeAsync(8_000);
    expect(submit.disabled).toBe(false);
    expect(submit.textContent).toBe("创建规则");
    expect((document.querySelector("#rule-error") as HTMLElement).textContent).toBe("保存规则超时，请重试");
    vi.useRealTimers();
  });
});
