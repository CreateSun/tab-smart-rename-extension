import type { ContentState } from "../shared/messages";
import type { PageOverride } from "../domain/types";

export class TitleController {
  private static readonly patchedHistory = new WeakSet<History>();
  private originalTitle: string;
  private originalIcon: string | null;
  private targetIcon: string | null = null;
  private targetTitle: string | null = null;
  private pageOverride: PageOverride | null = null;
  private observer: MutationObserver | null = null;
  private structureObserver: MutationObserver | null = null;
  private debounceMs = 150;
  private timer: number | null = null;
  private iconRestoreTimer: number | null = null;
  private currentUrl = location.href;

  constructor(private readonly doc: Document = document) {
    this.originalTitle = doc.title;
    this.originalIcon = this.readFavicon();
  }

  start(): void {
    if (this.observer) return;
    this.observer = new MutationObserver(() => this.onMutation());
    this.structureObserver = new MutationObserver(() => this.onStructureMutation());
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
    if (this.iconRestoreTimer !== null) window.clearTimeout(this.iconRestoreTimer);
    window.removeEventListener("popstate", this.onNavigation);
    window.removeEventListener("hashchange", this.onNavigation);
  }

  getState(): ContentState {
    const currentPageIcon = this.readFavicon();
    if (currentPageIcon) this.originalIcon = currentPageIcon;
    return { originalTitle: this.originalTitle, originalIcon: this.originalIcon, pageOverride: this.pageOverride };
  }

  setPageOverride(override: PageOverride | null): void { this.pageOverride = override; }

  apply(name: string | null, icon: string | null = null, debounceMs = 150, originalIcon?: string | null): void {
    this.debounceMs = debounceMs;
    if (originalIcon) this.originalIcon = originalIcon;
    this.targetTitle = name;
    this.targetIcon = icon;
    if (name === null) this.write(this.originalTitle);
    else this.write(name);
    this.writeIcon(icon);
    this.observeTitle();
  }

  clear(): void { this.targetTitle = null; this.targetIcon = null; this.write(this.originalTitle); this.writeIcon(null); }

  private readonly onNavigation = (): void => {
    if (location.href !== this.currentUrl) {
      this.currentUrl = location.href;
      this.pageOverride = null;
      this.writeIcon(null, false);
      this.originalIcon = this.readFavicon();
      this.targetIcon = null;
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

  private readFavicon(): string | null {
    const link = this.doc.querySelector<HTMLLinkElement>('link[rel~="icon"]:not([data-tab-rename-icon]):not([data-tab-rename-restore-icon]),link[rel="shortcut icon"]:not([data-tab-rename-icon]):not([data-tab-rename-restore-icon])');
    return link?.href || null;
  }

  private writeIcon(emoji: string | null, restoreOriginal = true): void {
    if (this.iconRestoreTimer !== null) {
      window.clearTimeout(this.iconRestoreTimer);
      this.iconRestoreTimer = null;
    }
    this.doc.querySelector<HTMLLinkElement>('link[data-tab-rename-restore-icon="1"]')?.remove();
    const existing = this.doc.querySelector<HTMLLinkElement>('link[data-tab-rename-icon="1"]');
    if (!emoji) {
      existing?.remove();
      if (restoreOriginal && this.originalIcon) this.pulseOriginalIcon(this.originalIcon);
      return;
    }
    const link = existing ?? this.doc.createElement("link");
    link.rel = "icon"; link.dataset.tabRenameIcon = "1"; link.href = emojiDataUrl(emoji);
    if (!existing) (this.doc.head ?? this.doc.documentElement).append(link);
  }

  private pulseOriginalIcon(originalIcon: string): void {
    const link = this.doc.createElement("link");
    link.rel = "icon";
    link.dataset.tabRenameRestoreIcon = "1";
    link.href = originalIcon;
    (this.doc.head ?? this.doc.documentElement).append(link);
    this.iconRestoreTimer = window.setTimeout(() => {
      link.remove();
      this.iconRestoreTimer = null;
    }, 250);
  }

  private onStructureMutation(): void {
    this.structureObserver?.disconnect();
    if (this.targetIcon) {
      const existing = this.doc.querySelector<HTMLLinkElement>('link[data-tab-rename-icon="1"]');
      existing?.remove();
      this.writeIcon(this.targetIcon);
    }
    this.observeTitle();
  }

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

const emojiDataUrl = (emoji: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="white"/><text x="32" y="45" text-anchor="middle" font-size="42">${emoji}</text></svg>`)}`;
