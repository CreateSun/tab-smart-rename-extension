import type { RenameRule, StoredStateV1 } from "../domain/types";
import type { UiRequest } from "../shared/messages";
const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
const LOG_PREFIX = "[Tab Rename]";
let state: StoredStateV1;
const dialog = $("#rule-dialog");
const ruleHelpDialog = $("#rule-help-dialog");
const form = $("#rule-form") as HTMLFormElement;
const ruleId = $("#rule-id") as HTMLInputElement;
const ruleKind = $("#rule-kind") as HTMLSelectElement;
const ruleValue = $("#rule-value") as HTMLInputElement;
const ruleLabel = $("#rule-label") as HTMLInputElement;
const ruleName = $("#rule-name") as HTMLInputElement;
const request = <T>(message: UiRequest, timeoutMs?: number): Promise<T> => {
  const response = chrome.runtime.sendMessage(message).then((value: { ok: boolean; data?: T; error?: string }) => {
    if (!value.ok) throw new Error(value.error);
    return value.data as T;
  });
  if (!timeoutMs) return response;
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("保存规则超时，请重试")), timeoutMs);
    void response.then((value) => { window.clearTimeout(timeout); resolve(value); }, (error) => { window.clearTimeout(timeout); reject(error); });
  });
};
const status = (text: string) => { $("#status").textContent = text; };
async function load() { state = await request({ type: "LIST_STATE" }); render(); }
function render() {
  const query = ($("#search") as HTMLInputElement).value.toLowerCase();
  const rules = state.rules.filter((rule) => `${rule.ruleName} ${rule.name} ${rule.match.value}`.toLowerCase().includes(query));
  $("#rules").replaceChildren(...rules.map(ruleElement));
  if (!rules.length) $("#rules").textContent = "没有匹配的规则。";
}
function ruleElement(rule: RenameRule) {
  const row=document.createElement("article"); row.className=`rule ${rule.enabled ? "" : "disabled"}`;
  const info=document.createElement("div"); const title=document.createElement("strong"); title.textContent=rule.ruleName; const renamed=document.createElement("small"); renamed.textContent=`标签名称：${rule.name}`; const meta=document.createElement("small"); const matchLabel=rule.match.kind === "host" ? "域名" : rule.match.kind === "url-pattern" ? "URL 正则" : "精确 URL"; meta.textContent=`${matchLabel} · ${rule.match.value} · ${new Date(rule.updatedAt).toLocaleString()}`; info.append(title,renamed,meta);
  const actions=document.createElement("div"); actions.className="inline";
  const edit=button("编辑",()=>openRuleDialog(rule));
  const toggle=button(rule.enabled?"禁用":"启用",async()=>{
    toggle.disabled = true;
    await request({type:"TOGGLE_RULE",ruleId:rule.id}); await load();
  });
  const remove=button("删除",async()=>{
    if(!confirm(`确定删除规则「${rule.name}」吗?`)) return;
    remove.disabled = true;
    await request({type:"DELETE_RULE",ruleId:rule.id}); await load();
  });
  remove.classList.add("danger"); actions.append(edit,toggle,remove); row.append(info,actions); return row;
}
function button(label:string,onClick:()=>void){const value=document.createElement("button");value.type="button";value.className="secondary";value.textContent=label;value.onclick=onClick;return value;}
function updateRuleFields() {
  const value = ruleValue.value;
  if (value && ruleKind.value !== "host" && /\{[1-9][0-9]*\}/.test(value) && ruleKind.value !== "url-pattern") {
    ruleKind.value = "url-pattern";
  }
  const host = ruleKind.value === "host";
  const pattern = ruleKind.value === "url-pattern";
  ruleValue.placeholder = host ? "example.com" : pattern ? "https://captain.release.ctripcorp.com/app/{1}/.*" : "https://example.com/projects/42";
  const kind = host ? "域名" : pattern ? "URL 正则" : "精确 URL";
  $("#rule-preview").textContent = "当 " + kind + " 为「" + (ruleValue.value || ruleValue.placeholder) + "」时，标签命名为「" + (ruleName.value || "…") + "」";
}
function closeRuleDialog() {
  dialog.setAttribute("hidden", "");
  form.reset();
  $("#rule-error").textContent = "";
}
function closeRuleHelpDialog() { ruleHelpDialog.hidden = true; }
function openRuleHelpDialog() { ruleHelpDialog.hidden = false; $("#rule-help-close").focus(); }
function openRuleDialog(rule?: RenameRule) {
  form.reset(); ruleId.value = rule?.id ?? ""; ruleKind.value = rule?.match.kind ?? "exact-url"; ruleValue.value = rule?.match.value ?? ""; ruleLabel.value = rule?.ruleName ?? ""; ruleName.value = rule?.name ?? "";
  $("#rule-dialog-title").textContent = rule ? "编辑重命名规则" : "新建重命名规则";
  const submit = $("#rule-form button[type=submit]") as HTMLButtonElement;
  submit.disabled = false;
  submit.textContent = rule ? "保存规则" : "创建规则";
  $("#rule-error").textContent = ""; updateRuleFields(); dialog.hidden = false; ruleValue.focus();
}
function openPrefilledRuleFromLocation() {
  const parameters = new URLSearchParams(location.search);
  const editRuleId = parameters.get("ruleId");
  if (editRuleId) {
    const rule = state.rules.find((item) => item.id === editRuleId);
    if (rule) openRuleDialog(rule);
    else status("未找到要编辑的规则");
    history.replaceState(null, "", location.pathname);
    return;
  }
  if (parameters.get("newRule") !== "1") return;
  const url = parameters.get("url") ?? "";
  const title = parameters.get("title") ?? "";
  if (!url) return;
  openRuleDialog();
  ruleValue.value = url;
  ruleName.value = title;
  updateRuleFields();
  history.replaceState(null, "", location.pathname);
}
$("#search").addEventListener("input",render); $("#add").addEventListener("click",()=>openRuleDialog());
$("#rule-close").addEventListener("click", closeRuleDialog); $("#rule-cancel").addEventListener("click", closeRuleDialog);
$("#rule-help").addEventListener("click", openRuleHelpDialog);
$("#rule-form-help").addEventListener("click", openRuleHelpDialog);
$("#rule-help-close").addEventListener("click", closeRuleHelpDialog); $("#rule-help-done").addEventListener("click", closeRuleHelpDialog);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!ruleHelpDialog.hidden) closeRuleHelpDialog();
  else if (!dialog.hidden) closeRuleDialog();
});
ruleKind.addEventListener("change", updateRuleFields); ruleValue.addEventListener("input", updateRuleFields); ruleName.addEventListener("input", updateRuleFields);
form.addEventListener("submit", async (event) => {
  event.preventDefault(); const error = $("#rule-error");
  if (!ruleValue.value.trim() || !ruleLabel.value.trim() || !ruleName.value.trim()) { error.textContent = "请填写规则名称、过滤内容和新标签名称。"; return; }
  const submit = $("#rule-form button[type=submit]") as HTMLButtonElement;
  const isEditing = Boolean(ruleId.value);
  const traceId = crypto.randomUUID();
  submit.disabled = true;
  submit.textContent = "正在保存…";
  console.debug(LOG_PREFIX, "rule editor submitted", { traceId, isEditing, kind: ruleKind.value, value: ruleValue.value });
  try {
    await request({type:"UPSERT_RULE",traceId,rule:{id:ruleId.value || undefined,ruleName:ruleLabel.value,name:ruleName.value,match:{kind:ruleKind.value as "exact-url"|"url-pattern"|"host",value:ruleValue.value}}}, 8_000);
    console.debug(LOG_PREFIX, "rule editor received success", { traceId });
    closeRuleDialog();
    await load();
    status("规则已保存");
  }
  catch (reason) {
    console.error(LOG_PREFIX, "rule editor save failed", { traceId, reason });
    error.textContent = reason instanceof Error ? reason.message : "保存失败";
  }
  finally {
    submit.disabled = false;
    submit.textContent = isEditing ? "保存规则" : "创建规则";
  }
});
$("#permission").addEventListener("click",async()=>status(await request<boolean>({type:"REQUEST_HOST_PERMISSION"})?"已授权自动应用":"未授予网站访问权限"));
$("#export").addEventListener("click",async()=>{const json=await request<string>({type:"EXPORT_RULES"});const url=URL.createObjectURL(new Blob([json],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=`tab-rename-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$("#import").addEventListener("change",async(event)=>{const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;if(file.size>1_048_576){status("文件不能超过 1 MiB");return;}try{const result=await request<{added:number;updated:number;skipped:number;errors:string[]}>({type:"IMPORT_RULES",json:await file.text()});status(`导入完成：新增 ${result.added}，更新 ${result.updated}，跳过 ${result.skipped}，错误 ${result.errors.length}`);await load();}catch(error){status(error instanceof Error?error.message:"导入失败");}});
void load().then(openPrefilledRuleFromLocation).catch((error)=>status(error instanceof Error?error.message:"读取失败"));
