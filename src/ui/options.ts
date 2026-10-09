import type { RenameRule, StoredStateV1 } from "../domain/types";
import { previewRule } from "../domain/resolver";
import type { UiRequest } from "../shared/messages";
import { normalizeLanguage, translate, type MessageKey } from "../shared/i18n";
const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
const LOG_PREFIX = "[Tab Rename]";
let state: StoredStateV1;
let language: "en" | "zh_CN" = "en";
const tx = (key: MessageKey, params: Record<string, string | number> = {}) => translate(language, key, params);
function applyTranslations() {
  document.documentElement.lang = language === "zh_CN" ? "zh-CN" : "en";
  document.title = `Tab Rename · ${tx("options.title")}`;
  const text: Record<string, string> = {"#page-title":tx("options.title"),"#page-subtitle":tx("options.subtitle"),"#permission":tx("options.enableAutomatic"),"#permission-tip":tx("options.permissionHelp"),"#permission-faq-title":tx("options.permissionQuestion"),"#permission-faq-copy":tx("options.permissionFaq"),"#add":tx("options.newRule"),"#rules-heading":tx("options.rulesHeading"),"#import-export-title":tx("options.importExport"),"#export":tx("options.export"),"#import-label":tx("options.import"),"#privacy-link":tx("options.privacy"),"#footer-copy":tx("options.footer"),"#rule-kind-label":tx("options.matchType"),"#rule-value-label":tx("options.matchValue"),"#rule-label-label":tx("options.ruleName"),"#rule-name-label":tx("options.tabName"),"#rule-pattern-help":tx("options.patternHelp"),"#rule-help-title":tx("options.guideTitle"),"#rule-help-intro":tx("options.guideIntro"),"#rule-cancel":tx("common.cancel"),"#rule-help-done":tx("options.done"),"#rule-test-title":tx("options.testRule"),"#rule-test-description":tx("options.testDescription"),"#rule-test-run":tx("options.runRuleTest"),"#rule-test-label":tx("options.testUrlLabel")};
  for (const [selector, value] of Object.entries(text)) { const element = document.querySelector<HTMLElement>(selector); if (element) element.textContent = value; }
  const ruleHelp = document.querySelector<HTMLElement>("#rule-help"); if (ruleHelp) ruleHelp.setAttribute("aria-label", tx("options.ruleGuide"));
  const formHelp = document.querySelector<HTMLElement>("#rule-form-help"); if (formHelp) formHelp.setAttribute("aria-label", tx("options.ruleHelp"));
  const closeRule = document.querySelector<HTMLElement>("#rule-close"); if (closeRule) closeRule.setAttribute("aria-label", tx("options.closeRule"));
  const closeGuide = document.querySelector<HTMLElement>("#rule-help-close"); if (closeGuide) closeGuide.setAttribute("aria-label", tx("options.closeGuide"));
  const permissionHelp = document.querySelector<HTMLElement>("#permission-help"); if (permissionHelp) permissionHelp.setAttribute("aria-label", tx("options.permissionHelpAria"));
  const languageToggle = document.querySelector<HTMLElement>("#language-toggle"); if (languageToggle) { languageToggle.setAttribute("aria-label", tx("language.label")); for (const button of Array.from(languageToggle.querySelectorAll<HTMLButtonElement>("[data-language]"))) { const selected = button.dataset.language === language; const label = button.dataset.language === "en" ? tx("language.en") : tx("language.zh_CN"); button.setAttribute("aria-pressed", String(selected)); button.setAttribute("aria-label", label); button.title = label; button.textContent = button.dataset.language === "en" ? "EN" : "中文"; } }
  for (const [value,key] of [["exact-url","options.exactUrl"],["url-pattern","options.urlPattern"],["host","options.host"]] as const) { const option = document.querySelector<HTMLOptionElement>(`#rule-kind option[value="${value}"]`); if (option) option.text = tx(key); }
  for (const element of Array.from(document.querySelectorAll<HTMLElement>("[data-i18n]"))) element.textContent = tx(`options.${element.dataset.i18n}` as MessageKey);
  const search = document.querySelector<HTMLInputElement>("#search"); if (search) { search.placeholder = tx("options.search"); search.setAttribute("aria-label", tx("options.search")); }
  const value = document.querySelector<HTMLInputElement>("#rule-value"); if (value) value.placeholder = tx("options.exactPlaceholder"); const label = document.querySelector<HTMLInputElement>("#rule-label"); if (label) label.placeholder = tx("options.ruleLabelPlaceholder"); const name = document.querySelector<HTMLInputElement>("#rule-name"); if (name) name.placeholder = tx("options.namePlaceholder");
  const testUrl = document.querySelector<HTMLInputElement>("#rule-test-url"); if (testUrl) testUrl.placeholder = tx("options.testUrlPlaceholder");
  updateRuleTestToggleText();
}
const dialog = $("#rule-dialog");
const ruleHelpDialog = $("#rule-help-dialog");
const form = $("#rule-form") as HTMLFormElement;
const ruleId = $("#rule-id") as HTMLInputElement;
const ruleKind = $("#rule-kind") as HTMLSelectElement;
const ruleValue = $("#rule-value") as HTMLInputElement;
const ruleLabel = $("#rule-label") as HTMLInputElement;
const ruleName = $("#rule-name") as HTMLInputElement;
const ruleTestToggle = $("#rule-test-toggle") as HTMLButtonElement;
const ruleTest = $("#rule-test") as HTMLDivElement;
const ruleTestUrl = $("#rule-test-url") as HTMLInputElement;
const ruleTestResult = $("#rule-test-result") as HTMLParagraphElement;
const request = <T>(message: UiRequest, timeoutMs?: number): Promise<T> => {
  const response = chrome.runtime.sendMessage(message).then((value: { ok: boolean; data?: T; error?: string }) => {
    if (!value.ok) throw new Error(value.error);
    return value.data as T;
  });
  if (!timeoutMs) return response;
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(tx("error.timeout"))), timeoutMs);
    void response.then((value) => { window.clearTimeout(timeout); resolve(value); }, (error) => { window.clearTimeout(timeout); reject(error); });
  });
};
const status = (text: string, danger = false) => { const element = $("#status"); element.textContent = text; element.classList.toggle("danger-status", danger); element.setAttribute("role", danger ? "alert" : "status"); };
function updatePermissionUi(granted: boolean) {
  const permission = $("#permission") as HTMLButtonElement;
  permission.disabled = granted;
  permission.textContent = tx(granted ? "options.permissionGranted" : "options.enableAutomatic");
  permission.setAttribute("aria-pressed", String(granted));
  const faq = document.querySelector<HTMLElement>(".permission-faq");
  if (faq) faq.hidden = granted;
  const tip = document.querySelector<HTMLElement>(".tip-wrap");
  if (tip) tip.hidden = granted;
}
async function refreshPermissionUi() {
  try {
    updatePermissionUi(await chrome.permissions.contains({ origins: ["http://*/*", "https://*/*"] }));
  } catch {
    updatePermissionUi(false);
  }
}
async function load() { state = await request({ type: "LIST_STATE" }); render(); }
function render() {
  const search = $("#search") as HTMLInputElement;
  const query = search.value.trim();
  const needle = query.toLowerCase();
  const rules = state.rules.filter((rule) => `${rule.ruleName} ${rule.name} ${rule.match.value}`.toLowerCase().includes(needle));
  const list = $("#rules");
  list.replaceChildren(...(rules.length ? rules.map(ruleElement) : [emptyElement(query)]));
  list.classList.toggle("is-empty", !rules.length);
  const count = $("#rule-count");
  count.textContent = query && rules.length !== state.rules.length
    ? tx("options.ruleCountFiltered", { shown: rules.length, total: state.rules.length })
    : tx("options.ruleCount", { count: state.rules.length });
  count.hidden = state.rules.length === 0 && !query;
}
function emptyElement(query: string) {
  const wrap = document.createElement("div");
  wrap.className = "rule-empty";
  const title = document.createElement("strong");
  const body = document.createElement("p");
  if (query) {
    title.textContent = tx("options.emptySearchTitle");
    body.textContent = tx("options.emptySearchBody", { query });
  } else {
    title.textContent = tx("options.emptyTitle");
    body.textContent = tx("options.emptyBody");
  }
  wrap.append(title, body);
  const action = document.createElement("button");
  action.type = "button";
  if (query) {
    action.className = "secondary";
    action.textContent = tx("options.clearSearch");
    action.onclick = () => { ($("#search") as HTMLInputElement).value = ""; render(); };
  } else {
    action.textContent = tx("options.newRule");
    action.onclick = () => openRuleDialog();
  }
  wrap.append(action);
  return wrap;
}
function ruleElement(rule: RenameRule) {
  const row=document.createElement("article"); row.className=`rule ${rule.enabled ? "" : "disabled"}`;
  const info=document.createElement("div"); const title=document.createElement("strong"); title.textContent=rule.ruleName; const renamed=document.createElement("small"); renamed.textContent=`${tx("options.tabName")}: ${rule.name}`; const meta=document.createElement("small"); const matchLabel=rule.match.kind === "host" ? tx("options.host") : rule.match.kind === "url-pattern" ? tx("options.urlPattern") : tx("options.exactUrl"); meta.textContent=`${matchLabel} · ${rule.match.value} · ${new Date(rule.updatedAt).toLocaleString()}`; info.append(title,renamed,meta);
  const actions=document.createElement("div"); actions.className="rule-actions";
  const test=button(tx("options.test"),()=>openRuleDialogForTest(rule));
  test.classList.add("rule-test-action");
  test.setAttribute("aria-label", tx("options.testRuleAria", {name:rule.ruleName}));
  const edit=button(tx("options.edit"),()=>openRuleDialog(rule));
  const toggle=button("",async()=>{
    const hadFocus = document.activeElement === toggle;
    toggle.disabled = true;
    status("");
    try {
      await request({type:"TOGGLE_RULE",ruleId:rule.id}); await load();
      status(rule.enabled ? tx("options.disabledStatus", {name:rule.ruleName}) : tx("options.enabledStatus", {name:rule.ruleName}));
      if (hadFocus) {
        const replacement = Array.from(document.querySelectorAll<HTMLButtonElement>(".rule-switch")).find((item) => item.dataset.ruleId === rule.id);
        replacement?.focus();
      }
    } catch (error) {
      status(error instanceof Error ? error.message : tx("common.operationFailed"));
    } finally {
      toggle.disabled = false;
    }
  });
  toggle.className = "rule-switch";
  toggle.dataset.ruleId = rule.id;
  toggle.setAttribute("role", "switch");
  toggle.setAttribute("aria-checked", String(rule.enabled));
  toggle.setAttribute("aria-label", tx("options.enableRule", {name:rule.ruleName}));
  toggle.title = rule.enabled ? tx("options.enabledTitle") : tx("options.disabledTitle");
  const remove=button(tx("options.delete"),async()=>{
    if(!confirm(tx("options.deleteConfirm", {name:rule.name}))) return;
    remove.disabled = true;
    await request({type:"DELETE_RULE",ruleId:rule.id}); await load();
  });
  remove.classList.add("danger"); actions.append(toggle,test,edit,remove); row.append(info,actions); return row;
}
function button(label:string,onClick:()=>void){const value=document.createElement("button");value.type="button";value.className="secondary";value.textContent=label;value.onclick=onClick;return value;}
function updateRuleFields() {
  const value = ruleValue.value;
  if (value && ruleKind.value !== "host" && /\{[1-9][0-9]*\*?\}/.test(value) && ruleKind.value !== "url-pattern") {
    ruleKind.value = "url-pattern";
  }
  const host = ruleKind.value === "host";
  const pattern = ruleKind.value === "url-pattern";
  ruleValue.placeholder = host ? tx("options.hostPlaceholder") : pattern ? tx("options.patternPlaceholder") : tx("options.exactPlaceholder");
  const kind = host ? tx("options.host") : pattern ? tx("options.urlPattern") : tx("options.exactUrl");
  $("#rule-preview").textContent = tx("options.preview", { kind, value: ruleValue.value || ruleValue.placeholder, name: ruleName.value || "…" });
}
function clearRuleTestResult() {
  ruleTestResult.textContent = "";
  ruleTestResult.className = "rule-test-result";
}
function updateRuleTestToggleText() {
  ruleTestToggle.textContent = tx(ruleTest.hidden ? "options.testRule" : "options.hideRuleTest");
}
function setRuleTestExpanded(expanded: boolean, focus = false) {
  ruleTest.hidden = !expanded;
  ruleTestToggle.setAttribute("aria-expanded", String(expanded));
  updateRuleTestToggleText();
  if (!expanded) clearRuleTestResult();
  if (expanded && focus) ruleTestUrl.focus();
}
function resetRuleTest() {
  clearRuleTestResult();
  setRuleTestExpanded(false);
}
function closeRuleDialog() {
  dialog.setAttribute("hidden", "");
  form.reset();
  $("#rule-error").textContent = "";
  resetRuleTest();
}
function closeRuleHelpDialog() { ruleHelpDialog.hidden = true; }
function openRuleHelpDialog() { ruleHelpDialog.hidden = false; $("#rule-help-close").focus(); }
function openRuleDialog(rule?: RenameRule) {
  form.reset(); resetRuleTest(); ruleId.value = rule?.id ?? ""; ruleKind.value = rule?.match.kind ?? "exact-url"; ruleValue.value = rule?.match.value ?? ""; ruleLabel.value = rule?.ruleName ?? ""; ruleName.value = rule?.name ?? "";
  $("#rule-dialog-title").textContent = rule ? tx("options.editRule") : tx("options.newRule");
  const submit = $("#rule-form button[type=submit]") as HTMLButtonElement;
  submit.disabled = false;
  submit.textContent = rule ? tx("options.saveRule") : tx("options.createRule");
  $("#rule-error").textContent = ""; updateRuleFields(); dialog.hidden = false; ruleValue.focus();
}
function openRuleDialogForTest(rule: RenameRule) {
  openRuleDialog(rule);
  setRuleTestExpanded(true, true);
}
function runRuleTest() {
  const result = previewRule({ kind: ruleKind.value as "exact-url" | "url-pattern" | "host", value: ruleValue.value, name: ruleName.value, rawUrl: ruleTestUrl.value });
  ruleTestResult.className = `rule-test-result ${result.status}`;
  if (result.status === "matched") {
    const name = document.createElement("strong");
    name.textContent = result.name;
    ruleTestResult.replaceChildren(document.createTextNode(`${tx("options.testMatchedLabel")} `), name);
    return;
  }
  const invalidMessages = {
    "target-url": "options.testInvalidTargetUrl",
    "match-value": "options.testInvalidMatchValue",
    name: "options.testInvalidName",
  } as const;
  ruleTestResult.textContent = result.status === "unmatched" ? tx("options.testUnmatched") : tx(invalidMessages[result.reason]);
}
function openPrefilledRuleFromLocation() {
  const parameters = new URLSearchParams(location.search);
  const editRuleId = parameters.get("ruleId");
  if (editRuleId) {
    const rule = state.rules.find((item) => item.id === editRuleId);
    if (rule) openRuleDialog(rule);
    else status(tx("options.notFound"));
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
document.querySelector<HTMLElement>("#language-toggle")?.addEventListener("click", async (event) => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-language]");
  if (!target) return;
  language = normalizeLanguage(target.dataset.language);
  await request({ type: "SET_LANGUAGE", language });
  applyTranslations(); render(); updateRuleFields(); clearRuleTestResult();
});
$("#rule-close").addEventListener("click", closeRuleDialog); $("#rule-cancel").addEventListener("click", closeRuleDialog);
$("#rule-help").addEventListener("click", openRuleHelpDialog);
$("#rule-form-help").addEventListener("click", openRuleHelpDialog);
$("#rule-help-close").addEventListener("click", closeRuleHelpDialog); $("#rule-help-done").addEventListener("click", closeRuleHelpDialog);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!ruleHelpDialog.hidden) closeRuleHelpDialog();
  else if (!dialog.hidden) closeRuleDialog();
});
ruleKind.addEventListener("change", () => { updateRuleFields(); clearRuleTestResult(); });
ruleValue.addEventListener("input", () => { updateRuleFields(); clearRuleTestResult(); });
ruleName.addEventListener("input", () => { updateRuleFields(); clearRuleTestResult(); });
ruleTestUrl.addEventListener("input", clearRuleTestResult);
ruleTestUrl.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); runRuleTest(); } });
ruleTestToggle.addEventListener("click", () => setRuleTestExpanded(ruleTest.hidden, true));
$("#rule-test-run").addEventListener("click", runRuleTest);
form.addEventListener("submit", async (event) => {
  event.preventDefault(); const error = $("#rule-error");
  if (!ruleValue.value.trim() || !ruleLabel.value.trim() || !ruleName.value.trim()) { error.textContent = tx("options.fillRequired"); return; }
  const submit = $("#rule-form button[type=submit]") as HTMLButtonElement;
  const isEditing = Boolean(ruleId.value);
  const traceId = crypto.randomUUID();
  submit.disabled = true;
  submit.textContent = tx("common.saving");
  console.debug(LOG_PREFIX, "rule editor submitted", { traceId, isEditing, kind: ruleKind.value, value: ruleValue.value });
  try {
    // Ask from this user-gesture handler so Chrome can attribute the optional
    // host permission request to the user's click. Granting it also installs
    // the automatic content script and refreshes tabs that are already open.
    let automaticEnabled = true;
    try {
      automaticEnabled = await chrome.permissions.request({ origins: ["http://*/*", "https://*/*"] });
    } catch {
      automaticEnabled = false;
    }
    await request({type:"UPSERT_RULE",traceId,rule:{id:ruleId.value || undefined,ruleName:ruleLabel.value,name:ruleName.value,match:{kind:ruleKind.value as "exact-url"|"url-pattern"|"host",value:ruleValue.value}}}, 8_000);
    console.debug(LOG_PREFIX, "rule editor received success", { traceId });
    closeRuleDialog();
    await load();
    updatePermissionUi(automaticEnabled);
    status(automaticEnabled ? tx("options.ruleSaved") : tx("options.ruleSavedPermissionDenied"), !automaticEnabled);
  }
  catch (reason) {
    console.error(LOG_PREFIX, "rule editor save failed", { traceId, reason });
    error.textContent = reason instanceof Error ? reason.message : tx("common.operationFailed");
  }
  finally {
    submit.disabled = false;
    submit.textContent = isEditing ? tx("options.saveRule") : tx("options.createRule");
  }
});
$("#permission").addEventListener("click", async () => {
  try {
    const granted = await chrome.permissions.request({ origins: ["http://*/*", "https://*/*"] });
    updatePermissionUi(granted);
    status(granted ? tx("options.permissionGranted") : tx("options.permissionDenied"), !granted);
  } catch {
    updatePermissionUi(false);
    status(tx("options.permissionDenied"), true);
  }
});
$("#export").addEventListener("click",async()=>{const json=await request<string>({type:"EXPORT_RULES"});const url=URL.createObjectURL(new Blob([json],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=`tab-rename-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$("#import").addEventListener("change",async(event)=>{const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;if(file.size>1_048_576){status(tx("options.fileTooLarge"));return;}try{const result=await request<{added:number;updated:number;skipped:number;errors:string[]}>({type:"IMPORT_RULES",json:await file.text()});status(tx("options.importComplete", {added:result.added,updated:result.updated,skipped:result.skipped,errors:result.errors.length}));await load();}catch(error){status(error instanceof Error?error.message:tx("common.operationFailed"));}});
void load().then(async () => { language = normalizeLanguage(state.settings.language); applyTranslations(); render(); await refreshPermissionUi(); return openPrefilledRuleFromLocation(); }).catch((error)=>status(error instanceof Error?error.message:tx("common.operationFailed")));
