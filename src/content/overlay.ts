import type { TabSnapshot, UiRequest } from "../shared/messages";

const HOST_ID = "tab-smart-rename-overlay-host";

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
    setTimeout(() => { host.remove(); if (this.host === host) { this.host = null; this.shadow = null; } }, 280);
  }

  private bind(): void {
    const root = this.shadow!;
    root.querySelector(".backdrop")?.addEventListener("click", () => this.close());
    root.querySelector(".close")?.addEventListener("click", () => this.close());
    root.querySelector(".manage")?.addEventListener("click", () => void this.request({ type: "OPEN_OPTIONS" }));
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
    const labels = { page: "仅当前页面命名", tab: "当前标签命名", "exact-url": "来自精确 URL 规则", host: "来自域名规则", original: "页面原标题", paused: "此站点已暂停" };
    this.shadow.querySelector<HTMLElement>(".source")!.textContent = labels[source.kind];
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
    try {
      if (mode === "permanent") {
        const allowed = await this.request<boolean>({ type: "REQUEST_HOST_PERMISSION" });
        if (!allowed) throw new Error("需要网站访问权限，才能在未来页面自动应用规则");
      }
      await this.request({ type: "SAVE_NAME", name: this.input()!.value, mode, scope });
      this.shadow.querySelector(".panel")?.classList.add("success");
      setTimeout(() => this.close(), 170);
    } catch (error) { this.showError(error); this.setBusy(false); }
  }

  private async restore(): Promise<void> {
    if (!this.snapshot) return;
    try {
      if (this.snapshot.source.kind === "exact-url" || this.snapshot.source.kind === "host") {
        await this.request({ type: "SUPPRESS_RULE" });
      } else await this.request({ type: "RESTORE_ORIGINAL" });
      this.close();
    } catch (error) { this.showError(error); }
  }

  private request<T>(message: UiRequest): Promise<T> {
    return chrome.runtime.sendMessage(message).then((response: { ok: boolean; data?: T; error?: string }) => {
      if (!response?.ok) throw new Error(response?.error ?? "操作失败，请重试");
      return response.data as T;
    });
  }

  private input(): HTMLInputElement | null { return this.shadow?.querySelector<HTMLInputElement>("#rename-input") ?? null; }
  private setBusy(value: boolean): void { const button = this.shadow?.querySelector<HTMLButtonElement>(".submit"); if (button) { button.disabled = value; button.textContent = value ? "正在保存…" : "保存名称"; } }
  private showError(error: unknown): void { const target = this.shadow?.querySelector<HTMLElement>(".error"); if (target) target.textContent = error instanceof Error ? error.message : "操作失败，请重试"; }
}

const MARKUP = `
<div class="stage" role="dialog" aria-modal="true" aria-labelledby="rename-title">
  <div class="backdrop"></div><div class="glow glow-a"></div><div class="glow glow-b"></div>
  <section class="panel">
    <header><div><span class="kicker">TAB SMART RENAME</span><h1 id="rename-title">这一页，叫什么？</h1><p>给当前标签一个更好认的名字。</p></div><button class="close" type="button" aria-label="关闭">×</button></header>
    <div class="loading">正在读取页面信息…</div>
    <form hidden>
      <div class="facts"><span class="source"></span><div><small>页面原标题</small><p class="original"></p></div></div>
      <label class="input-label" for="rename-input">新的标签名称</label>
      <input id="rename-input" maxlength="256" autocomplete="off" spellcheck="false" required>
      <fieldset><legend>保留多久</legend><div class="modes">
        <label><input type="radio" name="mode" value="page"><span><b>这一页</b><small>刷新即恢复</small></span></label>
        <label><input type="radio" name="mode" value="tab" checked><span><b>这个标签</b><small>关闭标签后恢复</small></span></label>
        <label><input type="radio" name="mode" value="permanent"><span><b>始终如此</b><small>创建永久规则</small></span></label>
      </div></fieldset>
      <fieldset class="scope" hidden><legend>匹配范围</legend><div class="scope-options"><label><input type="radio" name="scope" value="exact-url" checked> 仅此 URL</label><label><input type="radio" name="scope" value="host"> 整个域名</label></div></fieldset>
      <p class="error" role="alert"></p>
      <footer><button class="manage ghost" type="button">管理规则</button><div><button class="restore ghost" type="button">恢复原标题</button><button class="submit" type="submit">保存名称 <span>↵</span></button></div></footer>
    </form>
  </section>
</div>`;

const STYLE = `<style>
:host{all:initial;position:fixed;inset:0;z-index:2147483647;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#15231b;color-scheme:light}.stage{position:fixed;inset:0;display:grid;place-items:center;padding:clamp(18px,4vw,56px);opacity:0;transition:opacity .24s cubic-bezier(.22,1,.36,1)}.stage.is-open{opacity:1}.stage.is-closing{opacity:0;transition-duration:.2s}.backdrop{position:absolute;inset:0;background:rgba(8,20,13,.56);backdrop-filter:blur(22px) saturate(115%);-webkit-backdrop-filter:blur(22px) saturate(115%)}.glow{position:absolute;width:42vw;height:42vw;border-radius:999px;filter:blur(95px);opacity:.28;pointer-events:none}.glow-a{left:-12vw;top:-14vw;background:#7df0ad;animation:drift-a 9s ease-in-out infinite alternate}.glow-b{right:-10vw;bottom:-18vw;background:#d5ef7c;animation:drift-b 11s ease-in-out infinite alternate}.panel{position:relative;width:min(780px,calc(100vw - 36px));max-height:calc(100vh - 36px);overflow:auto;padding:clamp(28px,5vw,54px);border:1px solid rgba(255,255,255,.62);border-radius:32px;background:linear-gradient(145deg,rgba(250,255,251,.94),rgba(237,247,240,.84));box-shadow:0 34px 100px rgba(0,20,9,.32),inset 0 1px rgba(255,255,255,.9);transform:translateY(36px) scale(.94);opacity:0;transition:transform .56s cubic-bezier(.16,1,.3,1),opacity .34s ease}.is-open .panel{transform:translateY(0) scale(1);opacity:1}.is-closing .panel{transform:translateY(18px) scale(.975);transition-duration:.22s}.panel.success{transform:scale(1.018);filter:brightness(1.03)}header{display:flex;justify-content:space-between;gap:30px;margin-bottom:32px}h1{font:700 clamp(36px,5vw,58px)/1.05 Georgia,"Times New Roman",serif;letter-spacing:-.045em;margin:8px 0 10px;color:#112b1d}header p{margin:0;color:#617066;font-size:17px}.kicker{font-size:11px;font-weight:800;letter-spacing:.18em;color:#19734a}.close{width:44px;height:44px;flex:none;border:1px solid #d7e3da;border-radius:50%;background:rgba(255,255,255,.7);color:#405248;font-size:26px;line-height:1;cursor:pointer}.close:hover{transform:rotate(5deg);background:white}.facts{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:18px;padding:15px 18px;border:1px solid rgba(31,100,63,.12);border-radius:16px;background:rgba(220,239,225,.55);margin-bottom:24px}.source{padding:6px 10px;border-radius:999px;background:#d5f0df;color:#176c45;font-size:12px;font-weight:750;white-space:nowrap}.facts small{color:#718078}.facts p{margin:2px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:510px;color:#3f5046}.input-label,legend{display:block;font-size:12px;font-weight:800;letter-spacing:.04em;color:#536159;margin-bottom:8px}#rename-input{box-sizing:border-box;width:100%;height:76px;padding:0 22px;border:1px solid #c5d4c9;border-radius:18px;background:rgba(255,255,255,.9);box-shadow:0 10px 32px rgba(35,85,54,.07);font:600 clamp(22px,3vw,31px)/1.2 inherit;color:#14271b;outline:none;transition:border-color .2s,box-shadow .2s,transform .25s}#rename-input:focus{border-color:#2b9a63;box-shadow:0 0 0 5px rgba(47,157,103,.13),0 16px 38px rgba(35,85,54,.1);transform:translateY(-2px)}fieldset{border:0;padding:0;margin:27px 0 0}.modes{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.modes label{position:relative;cursor:pointer}.modes input{position:absolute;opacity:0}.modes span{display:flex;flex-direction:column;gap:3px;min-height:78px;padding:15px;border:1px solid #d1ddd4;border-radius:15px;background:rgba(255,255,255,.55);transition:.28s cubic-bezier(.22,1,.36,1)}.modes label:hover span{transform:translateY(-3px);border-color:#a9c5b2}.modes input:checked+span{border-color:#258b58;background:#e0f3e7;box-shadow:inset 0 0 0 1px #258b58,0 10px 25px rgba(29,121,73,.1);transform:translateY(-3px)}.modes b{font-size:15px}.modes small{font-size:12px;color:#6c7a71}.scope-options{display:flex;gap:26px;padding:13px 16px;border-radius:13px;background:rgba(255,255,255,.6);font-size:14px}.error{min-height:22px;margin:14px 0 0;color:#b42318;font-size:13px}footer{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:10px}footer>div{display:flex;gap:9px}.submit,.ghost{border:0;border-radius:13px;padding:13px 18px;font:700 14px/1 inherit;cursor:pointer;transition:.22s}.submit{background:#176c45;color:white;box-shadow:0 10px 24px rgba(23,108,69,.22)}.submit:hover{transform:translateY(-2px);background:#0f5837}.submit:disabled{opacity:.65;cursor:wait}.submit span{margin-left:7px;opacity:.65}.ghost{background:transparent;color:#536159}.ghost:hover{background:#e4eee7;color:#1c5337}.loading{padding:42px 0;text-align:center;color:#68776e}@keyframes drift-a{to{transform:translate(14vw,9vh) scale(1.12)}}@keyframes drift-b{to{transform:translate(-12vw,-8vh) scale(.88)}}@media(max-width:620px){.panel{padding:25px 20px;border-radius:24px}.modes{grid-template-columns:1fr}.modes span{min-height:auto}.facts{grid-template-columns:1fr;gap:8px}footer{align-items:stretch;flex-direction:column-reverse}footer>div{display:grid;grid-template-columns:1fr 1.25fr}.manage{text-align:left}h1{font-size:36px}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition-duration:.01ms!important}}
</style>`;
