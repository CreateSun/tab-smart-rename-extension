import { handleUiRequest, refreshOpenTabs, removeClosedTab, resolveTab } from "../application/service";
import type { ContentEvent, UiRequest } from "../shared/messages";
import { openOverlayOnPage } from "./open-overlay";
import { readStoredState } from "../storage/state";
import { translate } from "../shared/i18n";
import { handleContextMenuClick, refreshContextMenu } from "./context-menus";
const AUTO_CONTENT_ID = "tab-rename-auto-content";
const AUTO_ORIGINS = ["http://*/*", "https://*/*"];
const LOG_PREFIX = "[Tab Rename]";

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
    await openOverlayOnPage(tab.id);
  } catch {
    await chrome.action.setBadgeBackgroundColor({ color: "#B42318", tabId: tab.id });
    await chrome.action.setBadgeText({ text: "!", tabId: tab.id });
    setTimeout(() => void chrome.action.setBadgeText({ text: "", tabId: tab.id }), 1800);
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  void refreshContextMenu();
  if (details.reason === "install") chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") });
  chrome.runtime.setUninstallURL("https://tally.so/r/obJD4x");
  void syncAutomaticContentScript();
});
chrome.runtime.onStartup.addListener(() => { void syncAutomaticContentScript(); void refreshContextMenu(); });
chrome.permissions.onAdded.addListener(() => { void syncAutomaticContentScript().then(() => refreshOpenTabs()); });
chrome.permissions.onRemoved.addListener(() => { void syncAutomaticContentScript().then(() => refreshOpenTabs()); });
chrome.action.onClicked.addListener((tab) => { void openRenameOverlay(tab.id); });
chrome.commands.onCommand.addListener((command) => { if (command === "_execute_action") void openRenameOverlay(); });

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  await handleContextMenuClick(info.menuItemId, tab?.id, openRenameOverlay);
});

chrome.runtime.onMessage.addListener((message: UiRequest | ContentEvent, sender, sendResponse) => {
  if (message?.type === "PAGE_FACT_CHANGED") {
    if (sender.tab?.id) chrome.tabs.get(sender.tab.id).then((tab) => resolveTab(tab)).catch(() => undefined);
    return false;
  }
  const request = message as UiRequest;
  const traceId = request.type === "SAVE_NAME" || request.type === "UPSERT_RULE" ? request.traceId : undefined;
  const operation = request.type === "UPSERT_RULE" ? "rule save" : "save";
  if (traceId) console.debug(LOG_PREFIX, `background received ${operation}`, { traceId, tabId: sender.tab?.id });
  handleUiRequest(request)
    .then(async (data) => {
      if (request.type === "SET_LANGUAGE") await refreshContextMenu();
      if (traceId) console.debug(LOG_PREFIX, `background replied to ${operation}`, { traceId });
      sendResponse({ ok: true, data });
    })
    .catch(async (error) => {
      console.error(LOG_PREFIX, "background request failed", { traceId, type: request.type, error });
      const language = await readStoredState().then((state) => state.settings.language).catch(() => "en" as const);
      sendResponse({ ok: false, error: error instanceof Error ? error.message : translate(language, "common.operationFailed") });
    });
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => { removeClosedTab(tabId).catch(() => undefined); });
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete" || changeInfo.url) chrome.tabs.get(tabId).then((tab) => resolveTab(tab)).catch(() => undefined);
});
chrome.runtime.onMessageExternal?.addListener?.((_message, _sender, sendResponse) => { sendResponse(false); });
void syncAutomaticContentScript();
void refreshContextMenu();
