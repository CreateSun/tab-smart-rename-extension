import { readStoredState } from "../storage/state";
import { translate } from "../shared/i18n";

export const RENAME_MENU_ID = "rename-tab";
export const GUIDE_MENU_ID = "view-welcome-guide";

let refreshQueue = Promise.resolve();

function removeAllMenus(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.contextMenus.removeAll(() => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message)); else resolve();
    });
  });
}

function createMenu(id: string, title: string, contexts: NonNullable<chrome.contextMenus.CreateProperties["contexts"]>): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.contextMenus.create({ id, title, contexts }, () => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message)); else resolve();
    });
  });
}

export function refreshContextMenu(): Promise<void> {
  refreshQueue = refreshQueue.then(async () => {
    const { settings } = await readStoredState();
    await removeAllMenus();
    await createMenu(RENAME_MENU_ID, translate(settings.language, "background.contextRename"), ["page"]);
    await createMenu(GUIDE_MENU_ID, translate(settings.language, "background.contextGuide"), ["action"]);
  }).catch((error) => console.error("[Tab Rename]", "context menu refresh failed", error));
  return refreshQueue;
}

export async function handleContextMenuClick(
  menuItemId: chrome.contextMenus.OnClickData["menuItemId"],
  tabId: number | undefined,
  openRenameOverlay: (tabId?: number) => Promise<void>
): Promise<void> {
  if (menuItemId === RENAME_MENU_ID) {
    await openRenameOverlay(tabId);
  } else if (menuItemId === GUIDE_MENU_ID) {
    await chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") });
  }
}
