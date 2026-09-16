import type { RenameRule, StoredStateV1 } from "../domain/types";
import type { UiRequest } from "../shared/messages";
const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
let state: StoredStateV1;
const request = async <T>(message: UiRequest): Promise<T> => { const response = await chrome.runtime.sendMessage(message) as { ok: boolean; data?: T; error?: string }; if (!response.ok) throw new Error(response.error); return response.data as T; };
const status = (text: string) => { $("#status").textContent = text; };
async function load() { state = await request({ type: "LIST_STATE" }); render(); }
function render() {
  const query = ($("#search") as HTMLInputElement).value.toLowerCase();
  const rules = state.rules.filter((rule) => `${rule.name} ${rule.match.value}`.toLowerCase().includes(query));
  $("#rules").replaceChildren(...rules.map(ruleElement));
  $("#paused").replaceChildren(...state.pausedHosts.map((host) => { const row = document.createElement("div"); row.className="paused-row"; row.textContent=host; const button=document.createElement("button"); button.className="secondary"; button.textContent="恢复"; button.onclick=async()=>{await request({type:"TOGGLE_HOST",hostname:host}); await load();}; row.append(button); return row; }));
  if (!rules.length) $("#rules").textContent = "没有匹配的规则。";
}
function ruleElement(rule: RenameRule) {
  const row=document.createElement("article"); row.className=`rule ${rule.enabled ? "" : "disabled"}`;
  const info=document.createElement("div"); const title=document.createElement("strong"); title.textContent=rule.name; const meta=document.createElement("small"); meta.textContent=`${rule.match.kind === "host" ? "域名" : "精确 URL"} · ${rule.match.value} · ${new Date(rule.updatedAt).toLocaleString()}`; info.append(title,meta);
  const actions=document.createElement("div"); actions.className="inline";
  const edit=button("编辑",async()=>editRule(rule)), toggle=button(rule.enabled?"暂停":"启用",async()=>{await request({type:"TOGGLE_RULE",ruleId:rule.id}); await load();}), remove=button("删除",async()=>{if(confirm(`确定删除规则“${rule.name}”吗？`)){await request({type:"DELETE_RULE",ruleId:rule.id}); await load();}}); remove.classList.add("danger"); actions.append(edit,toggle,remove); row.append(info,actions); return row;
}
function button(label:string,onClick:()=>void){const value=document.createElement("button");value.type="button";value.className="secondary";value.textContent=label;value.onclick=onClick;return value;}
async function editRule(rule?: RenameRule) {
  const name=prompt("规则名称",rule?.name??""); if(name===null)return; const kind=(prompt("类型：输入 exact-url 或 host",rule?.match.kind??"exact-url")??"") as "exact-url"|"host"; if(kind!=="exact-url"&&kind!=="host"){status("规则类型无效");return;} const value=prompt(kind==="host"?"域名":"完整 URL",rule?.match.value??""); if(value===null)return;
  try{await request({type:"UPSERT_RULE",rule:{id:rule?.id,name,match:{kind,value}}});await load();status("规则已保存");}catch(error){status(error instanceof Error?error.message:"保存失败");}
}
$("#search").addEventListener("input",render); $("#add").addEventListener("click",()=>editRule());
$("#permission").addEventListener("click",async()=>status(await request<boolean>({type:"REQUEST_HOST_PERMISSION"})?"已授权自动应用":"未授予网站访问权限"));
$("#export").addEventListener("click",async()=>{const json=await request<string>({type:"EXPORT_RULES"});const url=URL.createObjectURL(new Blob([json],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=`tab-rename-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$("#import").addEventListener("change",async(event)=>{const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;if(file.size>1_048_576){status("文件不能超过 1 MiB");return;}try{const result=await request<{added:number;updated:number;skipped:number;errors:string[]}>({type:"IMPORT_RULES",json:await file.text()});status(`导入完成：新增 ${result.added}，更新 ${result.updated}，跳过 ${result.skipped}，错误 ${result.errors.length}`);await load();}catch(error){status(error instanceof Error?error.message:"导入失败");}});
void load().catch((error)=>status(error instanceof Error?error.message:"读取失败"));
