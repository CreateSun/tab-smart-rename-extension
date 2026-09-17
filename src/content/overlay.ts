import type { TabSnapshot, UiRequest } from "../shared/messages";

const HOST_ID = "tab-smart-rename-overlay-host";
const LOG_PREFIX = "[Tab Rename]";

export class RenameOverlay {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private snapshot: TabSnapshot | null = null;
  private composing = false;
  private closing = false;
  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); this.close(); }
    if (event.key === "Enter" && this.composing) event.preventDefault();
  };

  async open(): Promise<void> {
    if (this.host?.isConnected) {
      this.input()?.focus();
      this.input()?.select();
      return;
    }
    this.closing = false;
    this.host = document.createElement("div");
    this.host.id = HOST_ID;
    this.shadow = this.host.attachShadow({ mode: "closed" });
    this.shadow.innerHTML = `${STYLE}${MARKUP}`;
    (document.documentElement ?? document.body).append(this.host);
    this.bind();
    document.addEventListener("keydown", this.onKeydown, true);
    requestAnimationFrame(() => this.shadow?.querySelector(".stage")?.classList.add("is-open"));
    try {
      this.snapshot = await this.request<TabSnapshot>({ type: "GET_CURRENT" });
      this.render();
    } catch (error) {
      this.showError(error);
    }
  }

  close(): void {
    if (!this.host || this.closing) return;
    this.closing = true;
    this.shadow?.querySelector(".stage")?.classList.remove("is-open");
    this.shadow?.querySelector(".stage")?.classList.add("is-closing");
    const host = this.host;
    document.removeEventListener("keydown", this.onKeydown, true);
    setTimeout(() => { host.remove(); if (this.host === host) { this.host = null; this.shadow = null; } }, 120);
  }

  private bind(): void {
    const root = this.shadow!;
    root.querySelector(".close")?.addEventListener("click", () => this.close());
    root.querySelector(".manage")?.addEventListener("click", () => void this.request({ type: "OPEN_OPTIONS" }));
    root.querySelector(".new-rule")?.addEventListener("click", () => {
      if (!this.snapshot) return;
      void this.request({ type: "OPEN_OPTIONS", newRule: { title: this.snapshot.originalTitle, url: this.snapshot.url } });
    });
    root.querySelector(".source")?.addEventListener("click", () => {
      this.openSourceRule();
    });
    root.querySelector<HTMLElement>(".source")?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      this.openSourceRule();
    });
    root.querySelectorAll<HTMLInputElement>('input[name="mode"]').forEach((radio) => radio.addEventListener("change", () => {
      root.querySelector<HTMLElement>(".scope")!.hidden = radio.value !== "permanent" || !radio.checked;
    }));
    const input = this.input()!;
    input.addEventListener("compositionstart", () => { this.composing = true; });
    input.addEventListener("compositionend", () => { this.composing = false; });
    root.querySelector("form")?.addEventListener("submit", (event) => void this.submit(event));
    root.querySelector(".restore")?.addEventListener("click", () => void this.restore());
  }

  private render(): void {
    if (!this.snapshot || !this.shadow) return;
    this.shadow.querySelector<HTMLElement>(".loading")!.hidden = true;
    if (this.snapshot.restricted) { this.showError(new Error("浏览器限制，无法修改此页面")); return; }
    this.shadow.querySelector<HTMLElement>("form")!.hidden = false;
    const source = this.snapshot.source;
    const labels = { page: "仅当前页面命名", tab: "当前标签命名", "exact-url": "来自精确 URL 规则", "url-pattern": "来自 URL 模式规则", host: "来自域名规则", original: "页面原标题", paused: "此站点已暂停" };
    const sourceElement = this.shadow.querySelector<HTMLElement>(".source")!;
    sourceElement.textContent = labels[source.kind];
    const hasRule = "ruleId" in source;
    sourceElement.toggleAttribute("data-rule-link", hasRule);
    sourceElement.setAttribute("role", hasRule ? "button" : "status");
    sourceElement.setAttribute("tabindex", hasRule ? "0" : "-1");
    sourceElement.setAttribute("title", hasRule ? "点击编辑这条规则" : "");
    const restore = this.shadow.querySelector<HTMLButtonElement>(".restore")!;
    restore.textContent = source.kind === "paused" ? "恢复此站点" : hasRule ? "暂停此站点" : "恢复原标题";
    const original = this.shadow.querySelector<HTMLElement>(".original")!;
    original.textContent = this.snapshot.originalTitle || "（无标题）";
    original.title = this.snapshot.originalTitle;
    const input = this.input()!;
    input.value = this.snapshot.effectiveName || this.snapshot.originalTitle;
    requestAnimationFrame(() => { input.focus(); input.select(); });
  }

  private async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.composing || !this.shadow) return;
    this.setBusy(true);
    const mode = (this.shadow.querySelector<HTMLInputElement>('input[name="mode"]:checked')?.value ?? "tab") as "page" | "tab" | "permanent";
    const scope = (this.shadow.querySelector<HTMLInputElement>('input[name="scope"]:checked')?.value ?? "exact-url") as "exact-url" | "host";
    const traceId = crypto.randomUUID();
    console.debug(LOG_PREFIX, "save requested", { traceId, mode, scope });
    try {
      if (mode === "permanent") {
        console.debug(LOG_PREFIX, "requesting host permission", { traceId });
        const allowed = await this.request<boolean>({ type: "REQUEST_HOST_PERMISSION" });
        console.debug(LOG_PREFIX, "host permission resolved", { traceId, allowed });
        if (!allowed) throw new Error("需要网站访问权限，才能在未来页面自动应用规则");
      }
      await this.request({ type: "SAVE_NAME", name: this.input()!.value, mode, scope, traceId }, 8_000);
      console.debug(LOG_PREFIX, "save completed", { traceId });
      this.shadow.querySelector(".panel")?.classList.add("success");
      setTimeout(() => this.close(), 170);
    } catch (error) {
      console.error(LOG_PREFIX, "save failed", { traceId, error });
      this.showError(error);
      this.setBusy(false);
    }
  }

  private async restore(): Promise<void> {
    if (!this.snapshot) return;
    try {
      if (this.snapshot.source.kind === "exact-url" || this.snapshot.source.kind === "url-pattern" || this.snapshot.source.kind === "host" || this.snapshot.source.kind === "paused") {
        await this.request({ type: "TOGGLE_HOST", hostname: this.snapshot.hostname! });
      } else await this.request({ type: "RESTORE_ORIGINAL" });
      this.close();
    } catch (error) { this.showError(error); }
  }

  private request<T>(message: UiRequest, timeoutMs?: number): Promise<T> {
    const response = chrome.runtime.sendMessage(message).then((response: { ok: boolean; data?: T; error?: string }) => {
      if (!response?.ok) throw new Error(response?.error ?? "操作失败，请重试");
      return response.data as T;
    });
    if (!timeoutMs) return response;
    return new Promise<T>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        console.error(LOG_PREFIX, "save response timed out", { timeoutMs });
        reject(new Error("保存超时，请重试"));
      }, timeoutMs);
      void response.then((value) => { window.clearTimeout(timeout); resolve(value); }, (error) => { window.clearTimeout(timeout); reject(error); });
    });
  }

  private openSourceRule(): void {
    const source = this.snapshot?.source;
    if (!source || !("ruleId" in source)) return;
    void this.request({ type: "OPEN_OPTIONS", ruleId: source.ruleId });
  }

  private input(): HTMLInputElement | null { return this.shadow?.querySelector<HTMLInputElement>("#rename-input") ?? null; }
  private setBusy(value: boolean): void { const button = this.shadow?.querySelector<HTMLButtonElement>(".submit"); if (button) { button.disabled = value; button.textContent = value ? "正在保存…" : "保存 ↵"; } }
  private showError(error: unknown): void { const target = this.shadow?.querySelector<HTMLElement>(".error"); if (target) target.textContent = error instanceof Error ? error.message : "操作失败，请重试"; }
}

const MARKUP = `
<div class="stage" role="dialog" aria-modal="true" aria-labelledby="rename-title">
  <div class="backdrop"></div><div class="grid"></div>
  <section class="panel">
    <header><div><span class="kicker">// TAB_RENAME</span><h1 id="rename-title">重命名当前标签</h1></div><button class="close" type="button" aria-label="关闭"><span>ESC</span> ×</button></header>
    <div class="loading">正在读取页面信息…</div>
    <form hidden>
      <label class="input-label" for="rename-input">NAME</label>
      <input id="rename-input" maxlength="256" autocomplete="off" spellcheck="false" required aria-describedby="original-title">
      <div class="facts"><span class="source"></span><p id="original-title" class="original"></p></div>
      <fieldset><legend>PERSISTENCE</legend><div class="modes">
        <label><input type="radio" name="mode" value="page"><span><b>这一页</b><small>刷新后恢复</small></span></label>
        <label><input type="radio" name="mode" value="tab" checked><span><b>这个标签</b><small>关闭后恢复</small></span></label>
        <label><input type="radio" name="mode" value="permanent"><span><b>永久规则</b><small>匹配后自动应用</small></span></label>
      </div></fieldset>
      <fieldset class="scope" hidden><legend>MATCH</legend><div class="scope-options"><label><input type="radio" name="scope" value="exact-url" checked> exact URL</label><label><input type="radio" name="scope" value="host"> hostname</label></div></fieldset>
      <p class="error" role="alert"></p>
      <footer><div class="rule-actions"><button class="manage ghost" type="button">管理规则</button><button class="new-rule ghost" type="button">新建规则</button></div><div><button class="restore ghost" type="button">暂停此站点</button><button class="submit" type="submit">保存 <span>↵</span></button></div></footer>
    </form>
  </section>
</div>`;

const STYLE = `<style>
:host{all:initial;position:fixed;inset:0;z-index:2147483647;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#15231b;color-scheme:light}.stage{position:fixed;inset:0;display:grid;place-items:center;padding:clamp(18px,4vw,56px);opacity:0;transition:opacity .24s cubic-bezier(.22,1,.36,1)}.stage.is-open{opacity:1}.stage.is-closing{opacity:0;transition-duration:.2s}.backdrop{position:absolute;inset:0;background:rgba(8,20,13,.56);backdrop-filter:blur(22px) saturate(115%);-webkit-backdrop-filter:blur(22px) saturate(115%)}.glow{position:absolute;width:42vw;height:42vw;border-radius:999px;filter:blur(95px);opacity:.28;pointer-events:none}.glow-a{left:-12vw;top:-14vw;background:#7df0ad;animation:drift-a 9s ease-in-out infinite alternate}.glow-b{right:-10vw;bottom:-18vw;background:#d5ef7c;animation:drift-b 11s ease-in-out infinite alternate}.panel{position:relative;width:min(780px,calc(100vw - 36px));max-height:calc(100vh - 36px);overflow:auto;padding:clamp(28px,5vw,54px);border:1px solid rgba(255,255,255,.62);border-radius:32px;background:linear-gradient(145deg,rgba(250,255,251,.94),rgba(237,247,240,.84));box-shadow:0 34px 100px rgba(0,20,9,.32),inset 0 1px rgba(255,255,255,.9);transform:translateY(36px) scale(.94);opacity:0;transition:transform .56s cubic-bezier(.16,1,.3,1),opacity .34s ease}.is-open .panel{transform:translateY(0) scale(1);opacity:1}.is-closing .panel{transform:translateY(18px) scale(.975);transition-duration:.22s}.panel.success{transform:scale(1.018);filter:brightness(1.03)}header{display:flex;justify-content:space-between;gap:30px;margin-bottom:32px}h1{font:700 clamp(36px,5vw,58px)/1.05 Georgia,"Times New Roman",serif;letter-spacing:-.045em;margin:8px 0 10px;color:#112b1d}header p{margin:0;color:#617066;font-size:17px}.kicker{font-size:11px;font-weight:800;letter-spacing:.18em;color:#19734a}.close{width:44px;height:44px;flex:none;border:1px solid #d7e3da;border-radius:50%;background:rgba(255,255,255,.7);color:#405248;font-size:26px;line-height:1;cursor:pointer}.close:hover{transform:rotate(5deg);background:white}.facts{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:18px;padding:15px 18px;border:1px solid rgba(31,100,63,.12);border-radius:16px;background:rgba(220,239,225,.55);margin-bottom:24px}.source{padding:6px 10px;border-radius:999px;background:#d5f0df;color:#176c45;font-size:12px;font-weight:750;white-space:nowrap}.facts small{color:#718078}.facts p{margin:2px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:510px;color:#3f5046}.input-label,legend{display:block;font-size:12px;font-weight:800;letter-spacing:.04em;color:#536159;margin-bottom:8px}#rename-input{box-sizing:border-box;width:100%;height:76px;padding:0 22px;border:1px solid #c5d4c9;border-radius:18px;background:rgba(255,255,255,.9);box-shadow:0 10px 32px rgba(35,85,54,.07);font:600 clamp(22px,3vw,31px)/1.2 inherit;color:#14271b;outline:none;transition:border-color .2s,box-shadow .2s,transform .25s}#rename-input:focus{border-color:#2b9a63;box-shadow:0 0 0 5px rgba(47,157,103,.13),0 16px 38px rgba(35,85,54,.1);transform:translateY(-2px)}fieldset{border:0;padding:0;margin:27px 0 0}.modes{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.modes label{position:relative;cursor:pointer}.modes input{position:absolute;opacity:0}.modes span{display:flex;flex-direction:column;gap:3px;min-height:78px;padding:15px;border:1px solid #d1ddd4;border-radius:15px;background:rgba(255,255,255,.55);transition:.28s cubic-bezier(.22,1,.36,1)}.modes label:hover span{transform:translateY(-3px);border-color:#a9c5b2}.modes input:checked+span{border-color:#258b58;background:#e0f3e7;box-shadow:inset 0 0 0 1px #258b58,0 10px 25px rgba(29,121,73,.1);transform:translateY(-3px)}.modes b{font-size:15px}.modes small{font-size:12px;color:#6c7a71}.scope-options{display:flex;gap:26px;padding:13px 16px;border-radius:13px;background:rgba(255,255,255,.6);font-size:14px}.error{min-height:22px;margin:14px 0 0;color:#b42318;font-size:13px}footer{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:10px}footer>div{display:flex;gap:9px}.rule-actions{flex-wrap:wrap}.submit,.ghost{border:0;border-radius:13px;padding:13px 18px;font:700 14px/1 inherit;cursor:pointer;transition:.22s}.submit{background:#176c45;color:white;box-shadow:0 10px 24px rgba(23,108,69,.22)}.submit:hover{transform:translateY(-2px);background:#0f5837}.submit:disabled{opacity:.65;cursor:wait}.submit span{margin-left:7px;opacity:.65}.ghost{background:transparent;color:#536159}.ghost:hover{background:#e4eee7;color:#1c5337}.loading{padding:42px 0;text-align:center;color:#68776e}@keyframes drift-a{to{transform:translate(14vw,9vh) scale(1.12)}}@keyframes drift-b{to{transform:translate(-12vw,-8vh) scale(.88)}}@media(max-width:620px){.panel{padding:25px 20px;border-radius:24px}.modes{grid-template-columns:1fr}.modes span{min-height:auto}.facts{grid-template-columns:1fr;gap:8px}footer{align-items:stretch;flex-direction:column-reverse}footer>div{display:grid;grid-template-columns:1fr 1.25fr}.manage{text-align:left}h1{font-size:36px}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition-duration:.01ms!important}}
/* Compact tool UI overrides. Kept last so the visual contract is easy to tune. */
:host{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;color:#151817}
:host *{box-sizing:border-box}
.stage{padding:18px;transition:opacity .09s linear}
.stage.is-closing{transition-duration:.08s}
.backdrop{background:rgba(234,238,235,.28);backdrop-filter:blur(10px) saturate(75%);-webkit-backdrop-filter:blur(10px) saturate(75%)}
.grid{position:absolute;inset:0;pointer-events:none;opacity:.2;background-image:linear-gradient(rgba(21,24,23,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(21,24,23,.12) 1px,transparent 1px);background-size:24px 24px;mask-image:linear-gradient(to bottom,transparent,#000 35%,transparent)}
.panel{width:min(560px,calc(100vw - 28px));max-height:calc(100vh - 28px);padding:22px;border:1px solid #707873;border-radius:8px;background:rgba(248,250,248,.96);box-shadow:8px 8px 0 rgba(25,31,27,.16),0 18px 54px rgba(17,24,19,.13);transform:translateY(10px) scale(.985);transition:transform .16s cubic-bezier(.2,.8,.2,1),opacity .1s linear}
.is-closing .panel{transform:translateY(5px) scale(.992);transition-duration:.08s}
.panel.success{transform:translateX(3px);filter:none}
header{align-items:center;gap:18px;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid #c4cac6}
h1{font:700 18px/1.2 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;letter-spacing:-.02em;margin:4px 0 0;color:#151817}
.kicker{font-size:10px;font-weight:700;letter-spacing:.1em;color:#397d55}
.close{width:auto;height:30px;padding:0 9px;border:1px solid #aeb5b0;border-radius:3px;background:#f1f3f1;color:#303633;font:600 14px/1 ui-monospace,monospace}
.close span{margin-right:5px;color:#78807b;font-size:9px}
.close:hover{transform:none;background:#e4e8e5;border-color:#757d78}
.input-label,legend{font:700 10px/1.2 ui-monospace,monospace;letter-spacing:.12em;color:#5c6560;margin-bottom:6px}
#rename-input{height:68px;padding:0 14px;border:2px solid #252b27;border-radius:4px;background:#fff;box-shadow:none;font:700 clamp(24px,4vw,32px)/1.2 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;color:#111512;caret-color:#168245;transition:border-color .08s,box-shadow .08s}
#rename-input:focus{border-color:#168245;box-shadow:0 0 0 2px rgba(22,130,69,.18);transform:none}
.facts{display:flex;align-items:center;gap:9px;padding:8px 1px;margin:0 0 15px;border:0;border-radius:0;background:transparent;border-bottom:1px dashed #c7ccc9}
.source{padding:2px 5px;border:1px solid #9ab2a2;border-radius:2px;background:#eef5f0;color:#286841;font:700 9px/1.3 ui-monospace,monospace;text-transform:uppercase}.source[data-rule-link]{cursor:pointer}.source[data-rule-link]:hover,.source[data-rule-link]:focus{border-color:#286841;background:#dceee1;outline:0}
.facts p{max-width:none;margin:0;color:#6c746f;font:400 11px/1.4 ui-monospace,monospace}
fieldset{margin:15px 0 0}
.modes{gap:0;border:1px solid #aeb5b0;border-radius:4px;overflow:hidden}
.modes label+label{border-left:1px solid #aeb5b0}
.modes span{min-height:54px;padding:9px 10px;border:0;border-radius:0;background:#f5f7f5;transition:background .08s,color .08s}
.modes label:hover span{transform:none;background:#ecefec;border-color:transparent}
.modes input:focus-visible+span{outline:2px solid #168245;outline-offset:-2px}
.modes input:checked+span{border:0;background:#1e2721;color:#f4f7f5;box-shadow:none;transform:none}
.modes b{font:700 12px/1.3 ui-monospace,monospace}.modes small{font:400 9px/1.3 ui-monospace,monospace;color:#6c746f}.modes input:checked+span small{color:#afb8b2}
.scope-options{gap:20px;padding:9px 10px;border:1px solid #bcc3be;border-radius:3px;background:#f2f4f2;font:11px/1.4 ui-monospace,monospace}
.error{min-height:16px;margin:8px 0 0;font:11px/1.4 ui-monospace,monospace}
footer{margin-top:6px;padding-top:10px;border-top:1px solid #d0d5d1}
footer>div{gap:6px}.submit,.ghost{border-radius:3px;padding:10px 13px;font:700 11px/1 ui-monospace,monospace;transition:background .08s,color .08s,border-color .08s}
.submit{border:1px solid #151b17;background:#1d2520;color:#fff;box-shadow:none}.submit:hover{transform:none;background:#0f7138;border-color:#0f7138}.submit span{margin-left:5px}
.ghost{border:1px solid transparent;background:transparent;color:#545c57}.ghost:hover{background:#e8ebe9;color:#172019;border-color:#c1c7c3}
.loading{padding:32px 0;font:11px/1.4 ui-monospace,monospace;color:#69716c}
@media(max-width:620px){.panel{padding:16px;border-radius:5px}.modes{grid-template-columns:repeat(3,minmax(0,1fr))}.modes label+label{border-top:0;border-left:1px solid #aeb5b0}.modes span{min-height:54px;padding:8px 7px}.modes b{font-size:11px}.modes small{font-size:8px}.facts{display:flex}footer{align-items:center;flex-direction:row}.manage{text-align:left}h1{font-size:16px}}
@media(max-width:390px){header{margin-bottom:14px}.close span{display:none}.panel{padding:13px}.modes span{padding:7px 5px}.modes small{display:none}.submit,.ghost{padding:9px 8px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition-duration:.01ms!important}}
</style>`;
