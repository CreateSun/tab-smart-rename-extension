import { beforeEach, describe, expect, it, vi } from "vitest";
import { markOverlayRequested, openOverlayOnPage } from "../src/background/open-overlay";

const scripting = { executeScript: vi.fn() };

describe("fast overlay activation", () => {
  beforeEach(() => {
    scripting.executeScript.mockReset();
    Object.assign(chrome, { scripting });
  });

  it("opens an initialized overlay synchronously", () => {
    const open = vi.fn();
    const scope = globalThis as typeof globalThis & { __tabRenameOpenOverlay?: () => void; __tabRenameOverlayPending?: boolean };
    scope.__tabRenameOpenOverlay = open;
    scope.__tabRenameOverlayPending = true;

    expect(markOverlayRequested()).toBe(true);
    expect(open).toHaveBeenCalledOnce();
    expect(scope.__tabRenameOverlayPending).toBe(false);
  });

  it("marks first activation pending without waiting for a failed message", () => {
    expect(markOverlayRequested()).toBe(false);
    expect((globalThis as typeof globalThis & { __tabRenameOverlayPending?: boolean }).__tabRenameOverlayPending).toBe(true);
  });

  it("injects the content bundle only when the fast probe misses", async () => {
    scripting.executeScript.mockResolvedValueOnce([{ result: false }]).mockResolvedValueOnce([]);
    await openOverlayOnPage(7);
    expect(scripting.executeScript).toHaveBeenNthCalledWith(1, { target: { tabId: 7 }, func: markOverlayRequested });
    expect(scripting.executeScript).toHaveBeenNthCalledWith(2, { target: { tabId: 7 }, files: ["content.js"] });

    scripting.executeScript.mockClear();
    scripting.executeScript.mockResolvedValueOnce([{ result: true }]);
    await openOverlayOnPage(7);
    expect(scripting.executeScript).toHaveBeenCalledTimes(1);
  });
});
