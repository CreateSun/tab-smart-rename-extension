import type { ContentState } from "../shared/messages";
import type { PageOverride } from "../domain/types";

export class TitleController {
  private static readonly patchedHistory = new WeakSet<History>();
  private originalTitle: string;
  private targetTitle: string | null = null;
  private pageOverride: PageOverride | null = null;
  private observer: MutationObserver | null = null;
  private structureObserver: MutationObserver | null = null;
  private debounceMs = 150;
  private timer: number | null = null;
  private currentUrl = location.href;

  constructor(private readonly doc: Document = document) {
    this.originalTitle = doc.title;
  }

  start(): void {
    if (this.observer) return;
    this.observer = new MutationObserver(() => this.onMutation());
    this.structureObserver = new MutationObserver(() => this.observeTitle());
    this.observeTitle();
    window.addEventListener("popstate", this.onNavigation);
    window.addEventListener("hashchange", this.onNavigation);
    if (!TitleController.patchedHistory.has(history)) {
      this.patchHistory("pushState");
      this.patchHistory("replaceState");
      TitleController.patchedHistory.add(history);
    }
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.structureObserver?.disconnect();
    this.structureObserver = null;
    if (this.timer !== null) window.clearTimeout(this.timer);
    window.removeEventListener("popstate", this.onNavigation);
    window.removeEventListener("hashchange", this.onNavigation);
  }

  getState(): ContentState { return { originalTitle: this.originalTitle, pageOverride: this.pageOverride }; }

  setPageOverride(override: PageOverride | null): void { this.pageOverride = override; }

  apply(name: string | null, debounceMs = 150): void {
    this.debounceMs = debounceMs;
    this.targetTitle = name;
    if (name === null) this.write(this.originalTitle);
    else this.write(name);
    this.observeTitle();
  }

  clear(): void { this.targetTitle = null; this.write(this.originalTitle); }

  private readonly onNavigation = (): void => {
    if (location.href !== this.currentUrl) {
      this.currentUrl = location.href;
      this.pageOverride = null;
      void Promise.resolve(chrome.runtime.sendMessage({ type: "PAGE_FACT_CHANGED" })).catch(() => undefined);
    }
  };

  private patchHistory(method: "pushState" | "replaceState"): void {
    const original = history[method];
    const onNavigation = this.onNavigation;
    history[method] = function (...args: Parameters<History[typeof method]>) {
      const result = original.apply(this, args);
      onNavigation();
      return result;
    };
  }

  private onMutation(): void {
    const observed = this.doc.title;
    if (observed !== this.targetTitle) this.originalTitle = observed;
    if (this.targetTitle === null || observed === this.targetTitle || this.timer !== null) return;
    console.debug("[Tab Rename]", "external title change detected; scheduling reapply", { debounceMs: this.debounceMs });
    this.timer = window.setTimeout(() => {
      this.timer = null;
      if (this.targetTitle !== null && this.doc.title !== this.targetTitle) {
        console.debug("[Tab Rename]", "reapplying saved title");
        this.write(this.targetTitle);
      }
    }, this.debounceMs);
  }

  private write(value: string): void { if (this.doc.title !== value) this.doc.title = value; }

  private observeTitle(): void {
    if (!this.observer) return;
    this.observer.disconnect();
    this.structureObserver?.disconnect();
    let title = this.doc.querySelector("title");
    if (!title) {
      title = this.doc.createElement("title");
      (this.doc.head ?? this.doc.documentElement).append(title);
      title.textContent = this.targetTitle ?? this.originalTitle;
    }
    this.observer.observe(title, { childList: true, characterData: true, subtree: true });
    const structuralRoot = this.doc.head ?? this.doc.documentElement;
    this.structureObserver?.observe(structuralRoot, { childList: true });
  }
}
