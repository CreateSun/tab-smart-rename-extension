type OverlayPageScope = typeof globalThis & {
  __tabRenameOpenOverlay?: () => void;
  __tabRenameOverlayPending?: boolean;
};

/** Runs inside the extension's isolated page world. Keep this function self-contained. */
export function markOverlayRequested(): boolean {
  const scope = globalThis as OverlayPageScope;
  if (typeof scope.__tabRenameOpenOverlay === "function") {
    scope.__tabRenameOverlayPending = false;
    scope.__tabRenameOpenOverlay();
    return true;
  }
  scope.__tabRenameOverlayPending = true;
  return false;
}

export async function openOverlayOnPage(tabId: number): Promise<void> {
  const [probe] = await chrome.scripting.executeScript({
    target: { tabId },
    func: markOverlayRequested
  });
  if (!probe?.result) {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
  }
}
