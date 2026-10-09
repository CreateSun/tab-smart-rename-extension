// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_STATE } from "../src/domain/types";

const page = '<div id="language-toggle"><button type="button" data-language="en">EN</button><button type="button" data-language="zh_CN">中文</button></div><input id="search"><button id="add"></button><button id="rule-help"></button><span class="tip-wrap"><span id="permission-tip"></span></span><aside class="permission-faq"><p id="permission-faq-title"></p><p id="permission-faq-copy"></p></aside><h2 id="rules-heading"></h2><span id="rule-count"></span><p id="status"></p><div id="rules" class="rule-list"></div><button id="permission"></button><button id="export"></button><input id="import" type="file"><div id="rule-dialog" hidden><form id="rule-form"><input id="rule-id"><h2 id="rule-dialog-title"></h2><select id="rule-kind"><option value="exact-url">URL</option><option value="url-pattern">Pattern</option><option value="host">Host</option></select><input id="rule-value"><input id="rule-label"><input id="rule-name"><p id="rule-preview"></p><button id="rule-test-toggle" type="button" aria-controls="rule-test" aria-expanded="false"></button><div id="rule-test" role="group" aria-labelledby="rule-test-title" hidden><h3 id="rule-test-title"></h3><p id="rule-test-description"></p><label id="rule-test-label" for="rule-test-url"></label><div class="rule-test-controls"><input id="rule-test-url" type="url" autocomplete="off" spellcheck="false" aria-describedby="rule-test-description rule-test-result"><button id="rule-test-run" type="button"></button></div><p id="rule-test-result" aria-live="polite" aria-atomic="true"></p></div><p id="rule-error"></p><button id="rule-close" type="button"></button><button id="rule-form-help" type="button"></button><button id="rule-cancel" type="button"></button><button type="submit">Create rule</button></form></div><div id="rule-help-dialog" hidden><button id="rule-help-close" type="button"></button><button id="rule-help-done" type="button"></button></div>';

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

  it("toggles a rule with an accessible switch and retains focus after refresh", async () => {
    const state = structuredClone(DEFAULT_STATE);
    state.rules = [{ id: "rule-1", ruleName: "Example site", name: "Example", match: { kind: "host", value: "example.com" }, enabled: true, createdAt: "2026-09-19T00:00:00Z", updatedAt: "2026-09-19T00:00:00Z" }];
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(async (message) => {
      if ((message as unknown as { type: string }).type === "TOGGLE_RULE") state.rules[0]!.enabled = !state.rules[0]!.enabled;
      return { ok: true, data: structuredClone(state) };
    });
    await import("../src/ui/options");
    await vi.waitFor(() => expect(document.querySelector('[role="switch"]')).not.toBeNull());
    const toggle = document.querySelector('[role="switch"]') as HTMLButtonElement;
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(toggle.getAttribute("aria-label")).toBe("Enable rule: Example site");
    toggle.focus();
    toggle.click();
    expect(toggle.disabled).toBe(true);
    await vi.waitFor(() => expect(document.querySelector('[role="switch"]')?.getAttribute("aria-checked")).toBe("false"));
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "TOGGLE_RULE", ruleId: "rule-1" });
    expect(document.activeElement).toBe(document.querySelector('[role="switch"]'));
    (document.activeElement as HTMLButtonElement).click();
    await vi.waitFor(() => expect(document.querySelector('[role="switch"]')?.getAttribute("aria-checked")).toBe("true"));
  });

  it("keeps the switch state and allows retry when toggling fails", async () => {
    const state = structuredClone(DEFAULT_STATE);
    state.rules = [{ id: "rule-1", ruleName: "Example site", name: "Example", match: { kind: "host", value: "example.com" }, enabled: true, createdAt: "2026-09-19T00:00:00Z", updatedAt: "2026-09-19T00:00:00Z" }];
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(async (message) => {
      if ((message as unknown as { type: string }).type === "TOGGLE_RULE") return { ok: false, error: "无法保存规则" };
      return { ok: true, data: structuredClone(state) };
    });
    await import("../src/ui/options");
    await vi.waitFor(() => expect(document.querySelector('[role="switch"]')).not.toBeNull());
    const toggle = document.querySelector('[role="switch"]') as HTMLButtonElement;
    toggle.click();
    await vi.waitFor(() => expect(document.querySelector("#status")?.textContent).toBe("无法保存规则"));
    expect(toggle.disabled).toBe(false);
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  it("opens a saved rule directly in test mode", async () => {
    const state = structuredClone(DEFAULT_STATE);
    state.rules = [{ id: "rule-1", ruleName: "Example site", name: "Example $1", match: { kind: "url-pattern", value: "https://example.com/{1}" }, enabled: true, createdAt: "2026-09-19T00:00:00Z", updatedAt: "2026-09-19T00:00:00Z" }];
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(async () => ({ ok: true, data: structuredClone(state) }));
    await import("../src/ui/options");
    await vi.waitFor(() => expect(document.querySelector(".rule-test-action")).not.toBeNull());
    const actions = Array.from(document.querySelectorAll<HTMLButtonElement>(".rule-actions button"));
    expect(actions.map((action) => action.textContent)).toEqual(["", "Test", "Edit", "Delete"]);
    const test = document.querySelector(".rule-test-action") as HTMLButtonElement;
    expect(test.getAttribute("aria-label")).toBe("Test rule: Example site");
    test.click();
    expect((document.querySelector("#rule-dialog") as HTMLElement).hidden).toBe(false);
    expect((document.querySelector("#rule-id") as HTMLInputElement).value).toBe("rule-1");
    expect((document.querySelector("#rule-value") as HTMLInputElement).value).toBe("https://example.com/{1}");
    expect((document.querySelector("#rule-test") as HTMLElement).hidden).toBe(false);
    expect(document.querySelector("#rule-test-toggle")?.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(document.querySelector("#rule-test-url"));
  });

  it("renders an actionable empty state and a distinct no-search-result state", async () => {
    const state = structuredClone(DEFAULT_STATE);
    state.rules = [{ id: "rule-1", ruleName: "Example site", name: "Example", match: { kind: "host", value: "example.com" }, enabled: true, createdAt: "2026-09-19T00:00:00Z", updatedAt: "2026-09-19T00:00:00Z" }];
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(async () => ({ ok: true, data: structuredClone(state) }));
    await import("../src/ui/options");
    await vi.waitFor(() => expect(document.querySelector(".rule")).not.toBeNull());
    expect(document.querySelector("#rule-count")?.textContent).toBe("1 rules");
    expect(document.querySelector("#rules")?.classList.contains("is-empty")).toBe(false);

    const search = document.querySelector("#search") as HTMLInputElement;
    search.value = "nothing-here";
    search.dispatchEvent(new Event("input"));
    const empty = document.querySelector(".rule-empty") as HTMLElement;
    expect(empty).not.toBeNull();
    expect(empty.querySelector("strong")?.textContent).toBe("No matching rules");
    expect(empty.querySelector("p")?.textContent).toContain("nothing-here");
    expect(document.querySelector("#rules")?.classList.contains("is-empty")).toBe(true);
    expect(document.querySelector("#rule-count")?.textContent).toBe("0 of 1 rules");

    (empty.querySelector("button") as HTMLButtonElement).click();
    expect(search.value).toBe("");
    await vi.waitFor(() => expect(document.querySelector(".rule")).not.toBeNull());
  });

  it("offers rule creation from the empty state when no rules exist", async () => {
    await import("../src/ui/options");
    await vi.waitFor(() => expect(document.querySelector(".rule-empty")).not.toBeNull());
    const empty = document.querySelector(".rule-empty") as HTMLElement;
    expect(empty.querySelector("strong")?.textContent).toBe("No rules yet");
    expect((document.querySelector("#rule-count") as HTMLElement).hidden).toBe(true);
    (empty.querySelector("button") as HTMLButtonElement).click();
    expect((document.querySelector("#rule-dialog") as HTMLElement).hidden).toBe(false);
  });

  it("requests website access from the automatic-rules button and reports the result", async () => {
    vi.mocked(chrome.permissions.request).mockImplementationOnce((() => Promise.resolve(false)) as never).mockImplementationOnce((() => Promise.resolve(true)) as never);
    await import("../src/ui/options");
    await vi.waitFor(() => expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "LIST_STATE" }));

    (document.querySelector("#permission") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(chrome.permissions.request).toHaveBeenCalledWith({ origins: ["http://*/*", "https://*/*"] }));
    await vi.waitFor(() => expect((document.querySelector("#status") as HTMLElement).textContent).toContain("Other tabs cannot apply permanent rules automatically"));
    expect(document.querySelector(".permission-faq")?.hasAttribute("hidden")).toBe(false);
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith({ type: "REQUEST_HOST_PERMISSION" });

    (document.querySelector("#permission") as HTMLButtonElement).click();
    await vi.waitFor(() => expect((document.querySelector("#status") as HTMLElement).textContent).toBe("Automatic rules enabled"));
    expect((document.querySelector("#permission") as HTMLButtonElement).disabled).toBe(true);
    expect(document.querySelector(".permission-faq")?.hasAttribute("hidden")).toBe(true);
    expect(document.querySelector(".tip-wrap")?.hasAttribute("hidden")).toBe(true);
  });

  it("hides permission guidance when automatic rules are already enabled", async () => {
    vi.mocked(chrome.permissions.contains).mockImplementation((async () => true) as never);
    await import("../src/ui/options");
    await vi.waitFor(() => expect((document.querySelector("#permission") as HTMLButtonElement).disabled).toBe(true));
    expect((document.querySelector("#permission") as HTMLButtonElement).textContent).toBe("Automatic rules enabled");
    expect(document.querySelector(".permission-faq")?.hasAttribute("hidden")).toBe(true);
    expect(document.querySelector(".tip-wrap")?.hasAttribute("hidden")).toBe(true);
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
      expect((document.querySelector("#status") as HTMLElement).textContent).toBe("Rule saved");
      expect(chrome.permissions.request).toHaveBeenCalledWith({ origins: ["http://*/*", "https://*/*"] });
    });
  });

  it("toggles the test disclosure with accessible state and focus", async () => {
    await import("../src/ui/options");
    (document.querySelector("#add") as HTMLButtonElement).click();
    const toggle = document.querySelector("#rule-test-toggle") as HTMLButtonElement;
    const panel = document.querySelector("#rule-test") as HTMLElement;
    const testUrl = document.querySelector("#rule-test-url") as HTMLInputElement;
    expect(toggle.type).toBe("button");
    expect(toggle.getAttribute("aria-controls")).toBe("rule-test");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(panel.getAttribute("role")).toBe("group");
    expect(panel.getAttribute("aria-labelledby")).toBe("rule-test-title");
    expect(testUrl.type).toBe("url");
    expect(testUrl.getAttribute("aria-describedby")).toBe("rule-test-description rule-test-result");
    expect(document.querySelector("#rule-test-result")?.getAttribute("aria-live")).toBe("polite");
    expect(document.querySelector("#rule-test-result")?.getAttribute("aria-atomic")).toBe("true");
    expect(panel.hidden).toBe(true);
    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.textContent).toBe("Hide test");
    expect(panel.hidden).toBe(false);
    expect(document.activeElement).toBe(testUrl);
    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.textContent).toBe("Test rule");
    expect(panel.hidden).toBe(true);
  });

  it("runs the test with Enter without saving or requesting permission", async () => {
    await import("../src/ui/options");
    (document.querySelector("#add") as HTMLButtonElement).click();
    (document.querySelector("#rule-value") as HTMLInputElement).value = "https://example.com/work";
    (document.querySelector("#rule-name") as HTMLInputElement).value = "Work";
    const testUrl = document.querySelector("#rule-test-url") as HTMLInputElement;
    testUrl.value = "https://example.com/work";
    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    testUrl.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.querySelector("#rule-test-result")?.textContent).toContain("Work");
    expect(chrome.permissions.request).not.toHaveBeenCalled();
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: "UPSERT_RULE" }));
  });

  it("tests unsaved exact URL, host, and pattern rules", async () => {
    await import("../src/ui/options");
    (document.querySelector("#add") as HTMLButtonElement).click();
    const kind = document.querySelector("#rule-kind") as HTMLSelectElement;
    const value = document.querySelector("#rule-value") as HTMLInputElement;
    const name = document.querySelector("#rule-name") as HTMLInputElement;
    const testUrl = document.querySelector("#rule-test-url") as HTMLInputElement;
    const testRun = document.querySelector("#rule-test-run") as HTMLButtonElement;
    const result = document.querySelector("#rule-test-result") as HTMLElement;
    value.value = "https://example.com/work";
    name.value = "Work";
    testUrl.value = value.value;
    testRun.click();
    expect(result.textContent).toContain("Matched. Final tab name: Work");
    kind.value = "host";
    value.value = "example.com";
    testUrl.value = "https://other.example.com/work";
    testRun.click();
    expect(result.textContent).toBe("No match.");
    expect(result.classList.contains("unmatched")).toBe(true);
    kind.value = "url-pattern";
    value.value = "https://example.com/app/{1*}";
    name.value = "App $1";
    testUrl.value = "https://example.com/app/one/two";
    testRun.click();
    expect(result.textContent).toContain("App one/two");
  });

  it("shows actionable invalid test feedback", async () => {
    await import("../src/ui/options");
    (document.querySelector("#add") as HTMLButtonElement).click();
    const kind = document.querySelector("#rule-kind") as HTMLSelectElement;
    const value = document.querySelector("#rule-value") as HTMLInputElement;
    const name = document.querySelector("#rule-name") as HTMLInputElement;
    const testUrl = document.querySelector("#rule-test-url") as HTMLInputElement;
    const run = document.querySelector("#rule-test-run") as HTMLButtonElement;
    const result = document.querySelector("#rule-test-result") as HTMLElement;
    value.value = "https://example.com/work";
    name.value = "Work";
    testUrl.value = "invalid";
    run.click();
    expect(result.textContent).toContain("valid http/https target URL");
    testUrl.value = "https://example.com/work";
    value.value = "invalid";
    run.click();
    expect(result.textContent).toContain("match value is invalid");
    kind.value = "exact-url";
    value.value = "https://example.com/work";
    name.value = "";
    run.click();
    expect(result.textContent).toContain("enter a new tab name");
    expect(result.classList.contains("invalid")).toBe(true);
  });

  it("clears stale results when test inputs change", async () => {
    await import("../src/ui/options");
    (document.querySelector("#add") as HTMLButtonElement).click();
    const kind = document.querySelector("#rule-kind") as HTMLSelectElement;
    const value = document.querySelector("#rule-value") as HTMLInputElement;
    const name = document.querySelector("#rule-name") as HTMLInputElement;
    const testUrl = document.querySelector("#rule-test-url") as HTMLInputElement;
    const run = document.querySelector("#rule-test-run") as HTMLButtonElement;
    const result = document.querySelector("#rule-test-result") as HTMLElement;
    value.value = "https://example.com/work";
    name.value = "Work";
    testUrl.value = value.value;
    for (const [element, eventName] of [[kind, "change"], [value, "input"], [name, "input"], [testUrl, "input"]] as const) {
      run.click();
      expect(result.textContent).not.toBe("");
      element.dispatchEvent(new Event(eventName));
      expect(result.textContent).toBe("");
      expect(result.className).toBe("rule-test-result");
    }
  });

  it("resets test disclosure state when opening another rule editor", async () => {
    await import("../src/ui/options");
    const add = document.querySelector("#add") as HTMLButtonElement;
    const toggle = document.querySelector("#rule-test-toggle") as HTMLButtonElement;
    const panel = document.querySelector("#rule-test") as HTMLElement;
    add.click();
    toggle.click();
    (document.querySelector("#rule-test-url") as HTMLInputElement).value = "https://example.com/work";
    (document.querySelector("#rule-close") as HTMLButtonElement).click();
    add.click();
    expect(panel.hidden).toBe(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.textContent).toBe("Test rule");
    expect(document.querySelector("#rule-test-result")?.textContent).toBe("");
    expect((document.querySelector("#rule-test-url") as HTMLInputElement).value).toBe("");
  });

  it("keeps the disclosure state and clears translated results when language changes", async () => {
    await import("../src/ui/options");
    (document.querySelector("#add") as HTMLButtonElement).click();
    const toggle = document.querySelector("#rule-test-toggle") as HTMLButtonElement;
    toggle.click();
    (document.querySelector("#rule-value") as HTMLInputElement).value = "https://example.com/work";
    (document.querySelector("#rule-name") as HTMLInputElement).value = "Work";
    (document.querySelector("#rule-test-url") as HTMLInputElement).value = "https://example.com/work";
    (document.querySelector("#rule-test-run") as HTMLButtonElement).click();
    expect(document.querySelector("#rule-test-result")?.textContent).not.toBe("");
    (document.querySelector('[data-language="zh_CN"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(document.documentElement.lang).toBe("zh-CN"));
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.textContent).toBe("收起测试");
    expect(document.querySelector("#rule-test-result")?.textContent).toBe("");
  });

  it("recognizes a multi-segment capture as a URL pattern", async () => {
    await import("../src/ui/options");
    (document.querySelector("#add") as HTMLButtonElement).click();
    const kind = document.querySelector("#rule-kind") as HTMLSelectElement;
    const value = document.querySelector("#rule-value") as HTMLInputElement;
    value.value = "https://example.com/app/{1*}";
    value.dispatchEvent(new Event("input"));
    expect(kind.value).toBe("url-pattern");
  });

  it("saves the rule and explains automatic access when permission is denied", async () => {
    vi.mocked(chrome.permissions.request).mockImplementation((() => Promise.resolve(false)) as never);
    await import("../src/ui/options");
    (document.querySelector("#add") as HTMLButtonElement).click();
    (document.querySelector("#rule-value") as HTMLInputElement).value = "https://example.com/{1}";
    (document.querySelector("#rule-label") as HTMLInputElement).value = "Example pattern";
    (document.querySelector("#rule-name") as HTMLInputElement).value = "Page $1";
    document.querySelector("#rule-form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "UPSERT_RULE" })));
    await vi.waitFor(() => expect((document.querySelector("#status") as HTMLElement).textContent).toContain("Other tabs cannot apply it automatically"));
    expect(document.querySelector("#status")?.getAttribute("role")).toBe("alert");
    expect(document.querySelector("#status")?.classList.contains("danger-status")).toBe(true);
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
    expect((document.querySelector("#rule-error") as HTMLElement).textContent).toBe("Please fill in the rule name, match value, and new tab name.");
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
    expect(submit.textContent).toBe("Saving…");
    await vi.advanceTimersByTimeAsync(8_000);
    expect(submit.disabled).toBe(false);
    expect(submit.textContent).toBe("Create rule");
    expect((document.querySelector("#rule-error") as HTMLElement).textContent).toBe("Saving timed out. Please try again");
    vi.useRealTimers();
  });

  it("switches to Chinese immediately and persists the manual choice", async () => {
    await import("../src/ui/options");
    await vi.waitFor(() => expect(document.documentElement.lang).toBe("en"));
    (document.querySelector('[data-language="zh_CN"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "SET_LANGUAGE", language: "zh_CN" }));
    await vi.waitFor(() => expect(document.documentElement.lang).toBe("zh-CN"));
    (document.querySelector("#add") as HTMLButtonElement).click();
    document.querySelector("#rule-form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(document.querySelector("#rule-error")?.textContent).toBe("请填写规则名称、过滤内容和新标签名称。");
  });
});
