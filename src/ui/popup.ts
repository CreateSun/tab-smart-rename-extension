import type { TabSnapshot, UiRequest } from "../shared/messages";

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const form = $("#form") as HTMLFormElement, nameInput = $("#name") as HTMLInputElement, error = $("#error");
let snapshot: TabSnapshot | null = null, composing = false;

const request = async <T>(message: UiRequest): Promise<T> => {
  const response = await chrome.runtime.sendMessage(message) as { ok: boolean; data?: T; error?: string };
  if (!response.ok) throw new Error(response.error ?? "操作失败");
  return response.data as T;
};

function sourceText(value: TabSnapshot): string {
  const source = value.source;
  if (source.kind === "page") return "仅当前页面命名";
  if (source.kind === "tab") return "当前标签命名";
  if (source.kind === "exact-url") return "来自精确 URL 规则";
  if (source.kind === "host") return `来自域名规则 ${source.matcher}`;
  if (source.kind === "paused") return "此站点已暂停";
  return "页面原标题";
}

async function init() {
  try {
    snapshot = await request<TabSnapshot>({ type: "GET_CURRENT" });
    $("#loading").hidden = true;
    if (snapshot.restricted) { $("#loading").hidden = false; $("#loading").textContent = "浏览器限制，无法修改此页面。请切换到普通网页后重试。"; return; }
    form.hidden = false;
    $("#source").textContent = sourceText(snapshot);
    const original = $("#original"); original.textContent = `原标题：${snapshot.originalTitle || "（无标题）"}`; original.title = snapshot.originalTitle;
    nameInput.value = snapshot.effectiveName || snapshot.originalTitle;
    nameInput.focus(); nameInput.select();
  } catch (cause) { $("#loading").textContent = cause instanceof Error ? cause.message : "无法读取页面"; }
}

document.querySelectorAll<HTMLInputElement>('input[name="mode"]').forEach((radio) => radio.addEventListener("change", () => { $("#scopeBox").hidden = radio.value !== "permanent" || !radio.checked; }));
nameInput.addEventListener("compositionstart", () => { composing = true; });
nameInput.addEventListener("compositionend", () => { composing = false; });
form.addEventListener("keydown", (event) => { if (event.key === "Escape") window.close(); if (event.key === "Enter" && composing) event.preventDefault(); });
form.addEventListener("submit", async (event) => {
  event.preventDefault(); if (composing) return; error.textContent = "";
  const mode = (form.elements.namedItem("mode") as RadioNodeList).value as "page" | "tab" | "permanent";
  const scope = (form.elements.namedItem("scope") as RadioNodeList).value as "exact-url" | "host";
  try {
    if (mode === "permanent") {
      const allowed = await chrome.permissions.request({ origins: ["http://*/*", "https://*/*"] });
      if (!allowed) throw new Error("需要网站访问权限才能在以后匹配的页面自动应用规则");
    }
    await request({ type: "SAVE_NAME", name: nameInput.value, mode, scope });
    window.close();
  } catch (cause) { error.textContent = cause instanceof Error ? cause.message : "保存失败"; }
});
$("#restore").addEventListener("click", async () => {
  if (!snapshot) return;
  if (snapshot.source.kind === "exact-url" || snapshot.source.kind === "host") {
    if (confirm("此名称来自永久规则。确定仅在当前页面忽略该规则吗？取消可前往管理页暂停或删除规则。")) await request({ type: "SUPPRESS_RULE" }); else chrome.runtime.openOptionsPage();
  } else await request({ type: "RESTORE_ORIGINAL" });
  window.close();
});
$("#manage").addEventListener("click", () => chrome.runtime.openOptionsPage());
void init();
