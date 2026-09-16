import { beforeEach, vi } from "vitest";

Object.assign(globalThis, { chrome: { runtime: { onMessage: { addListener: vi.fn() }, sendMessage: vi.fn() } } });
beforeEach(() => {
  vi.mocked(chrome.runtime.onMessage.addListener).mockClear();
  vi.mocked(chrome.runtime.sendMessage).mockReset();
});
