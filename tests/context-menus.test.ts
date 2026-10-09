import { beforeEach, describe, expect, it, vi } from "vitest";
import { GUIDE_MENU_ID, handleContextMenuClick, refreshContextMenu, RENAME_MENU_ID } from "../src/background/context-menus";

describe("context menus", () => {
  const created: chrome.contextMenus.CreateProperties[] = [];
  const removeAll = vi.fn<(callback?: () => void) => void>();
  const create = vi.fn<(properties: chrome.contextMenus.CreateProperties, callback?: () => void) => string | number>();
  const get = vi.fn();
  const tabsCreate = vi.fn();

  beforeEach(() => {
    created.length = 0;
    removeAll.mockReset().mockImplementation((callback) => callback?.());
    create.mockReset().mockImplementation((properties, callback) => {
      created.push(properties);
      callback?.();
      return properties.id ?? "menu";
    });
    get.mockReset();
    tabsCreate.mockReset();
    Object.assign(chrome, {
      runtime: { ...chrome.runtime, lastError: undefined, getURL: vi.fn((path: string) => `chrome-extension://test/${path}`) },
      storage: { local: { get } },
      contextMenus: { removeAll, create },
      tabs: { create: tabsCreate }
    });
  });

  it("creates localized page and extension-action entries without accumulating stale entries", async () => {
    get.mockResolvedValue({ storedState: { schemaVersion: 1, rules: [], settings: { language: "en", guardDebounceMs: 150 } } });
    await refreshContextMenu();
    expect(created).toEqual([
      { id: RENAME_MENU_ID, title: "Rename this tab…", contexts: ["page"] },
      { id: GUIDE_MENU_ID, title: "View welcome guide", contexts: ["action"] }
    ]);

    created.length = 0;
    get.mockResolvedValue({ storedState: { schemaVersion: 1, rules: [], settings: { language: "zh_CN", guardDebounceMs: 150 } } });
    await refreshContextMenu();
    expect(removeAll).toHaveBeenCalledTimes(2);
    expect(created.map(({ title }) => title)).toEqual(["重命名此标签页…", "查看使用指南"]);
  });

  it("opens the guide and preserves the existing webpage rename action", async () => {
    const openRenameOverlay = vi.fn().mockResolvedValue(undefined);
    await handleContextMenuClick(RENAME_MENU_ID, 42, openRenameOverlay);
    expect(openRenameOverlay).toHaveBeenCalledWith(42);

    await handleContextMenuClick(GUIDE_MENU_ID, undefined, openRenameOverlay);
    expect(tabsCreate).toHaveBeenCalledWith({ url: "chrome-extension://test/onboarding.html" });
  });
});
