import { beforeEach, vi } from "vitest";

Object.assign(globalThis, { chrome: { runtime: { onMessage: { addListener: vi.fn() }, sendMessage: vi.fn() }, permissions: { contains: vi.fn(async () => false), request: vi.fn(async () => true) } } });
beforeEach(() => {
  vi.mocked(chrome.runtime.onMessage.addListener).mockClear();
  vi.mocked(chrome.runtime.sendMessage).mockReset();
  vi.mocked(chrome.permissions.contains).mockReset();
  vi.mocked(chrome.permissions.contains).mockImplementation((async () => false) as never);
  vi.mocked(chrome.permissions.request).mockReset();
  vi.mocked(chrome.permissions.request).mockImplementation((async () => true) as never);
  const scope = globalThis as typeof globalThis & Record<string, unknown>;
  delete scope.__tabRenameController;
  delete scope.__tabRenameOverlay;
  delete scope.__tabRenameOpenOverlay;
  delete scope.__tabRenameOverlayPending;
  delete scope.__tabRenameListenerInstalled;
});
