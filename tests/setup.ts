import { beforeEach, vi } from "vitest";

Object.assign(globalThis, { chrome: { runtime: { onMessage: { addListener: vi.fn() }, sendMessage: vi.fn() } } });
beforeEach(() => {
  vi.mocked(chrome.runtime.onMessage.addListener).mockClear();
  vi.mocked(chrome.runtime.sendMessage).mockReset();
  const scope = globalThis as typeof globalThis & Record<string, unknown>;
  delete scope.__tabRenameController;
  delete scope.__tabRenameOverlay;
  delete scope.__tabRenameOpenOverlay;
  delete scope.__tabRenameOverlayPending;
  delete scope.__tabRenameListenerInstalled;
});
