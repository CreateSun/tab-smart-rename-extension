import { handleUiRequest, refreshOpenTabs, removeClosedTab, resolveTab } from "../application/service";
import type { ContentEvent, UiRequest } from "../shared/messages";

const MENU_ID = "rename-tab";
const AUTO_CONTENT_ID = "tab-rename-auto-content";
const AUTO_ORIGINS = ["http://*/*", "https://*/*"];

async function syncAutomaticContentScript(): Promise<void> {
  const allowed = await chrome.permissions.contains({ origins: AUTO_ORIGINS });
  const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [AUTO_CONTENT_ID] });
  if (allowed && registered.length === 0) {
    await chrome.scripting.registerContentScripts([{ id: AUTO_CONTENT_ID, matches: AUTO_ORIGINS, js: ["content.js"], runAt: "document_start", persistAcrossSessions: true }]);
  } else if (!allowed && registered.length > 0) {
    await chrome.scripting.unregisterContentScripts({ ids: [AUTO_CONTENT_ID] });
  }
}

async function openRenameOverlay(tabId?: number): Promise<void> {
  const tab = tabId ? await chrome.tabs.get(tabId) : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  if (!tab?.id || !tab.url) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "OPEN_RENAME_OVERLAY" });
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      await chrome.tabs.sendMessage(tab.id, { type: "OPEN_RENAME_OVERLAY" });
    } catch {
      await chrome.action.setBadgeBackgroundColor({ color: "#B42318", tabId: tab.id });
      await chrome.action.setBadgeText({ text: "!", tabId: tab.id });
      setTimeout(() => void chrome.action.setBadgeText({ text: "", tabId: tab.id }), 1800);
    }
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  chrome.contextMenus.removeAll().then(() => chrome.contextMenus.create({ id: MENU_ID, title: "重命名此标签页…", contexts: ["page"] }));
  if (details.reason === "install") chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") });
  void syncAutomaticContentScript();
});
chrome.runtime.onStartup.addListener(() => { void syncAutomaticContentScript(); });
chrome.permissions.onAdded.addListener(() => { void syncAutomaticContentScript().then(() => refreshOpenTabs()); });
chrome.permissions.onRemoved.addListener(() => { void syncAutomaticContentScript().then(() => refreshOpenTabs()); });
chrome.action.onClicked.addListener((tab) => { void openRenameOverlay(tab.id); });
chrome.commands.onCommand.addListener((command) => { if (command === "_execute_action") void openRenameOverlay(); });

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  await openRenameOverlay(tab?.id);
});

chrome.runtime.onMessage.addListener((message: UiRequest | ContentEvent, sender, sendResponse) => {
  if (message?.type === "PAGE_FACT_CHANGED") {
    if (sender.tab?.id) chrome.tabs.get(sender.tab.id).then((tab) => resolveTab(tab)).catch(() => undefined);
    return false;
  }
  handleUiRequest(message as UiRequest).then((data) => sendResponse({ ok: true, data })).catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "操作失败" }));
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => { removeClosedTab(tabId).catch(() => undefined); });
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete" || changeInfo.url) chrome.tabs.get(tabId).then((tab) => resolveTab(tab)).catch(() => undefined);
});
chrome.runtime.onMessageExternal?.addListener?.((_message, _sender, sendResponse) => { sendResponse(false); });
void syncAutomaticContentScript();
