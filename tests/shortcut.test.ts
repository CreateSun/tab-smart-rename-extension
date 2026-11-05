import { describe, expect, it } from "vitest";
import { formatShortcut } from "../src/shared/shortcut";

describe("formatShortcut", () => {
  it("renders Mac shortcuts with symbols in Apple modifier order", () => {
    expect(formatShortcut("Command+Shift+E", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe("⇧ ⌘ E");
    expect(formatShortcut("Shift+Command+E", "Macintosh")).toBe("⇧ ⌘ E");
    expect(formatShortcut("Alt+Shift+R", "Macintosh")).toBe("⌥ ⇧ R");
  });

  it("leaves non-Mac shortcuts untouched", () => {
    expect(formatShortcut("Ctrl+Shift+E", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("Ctrl+Shift+E");
  });

  it("keeps multi-character key names readable", () => {
    expect(formatShortcut("Command+Shift+Space", "Macintosh")).toBe("⇧ ⌘ Space");
    expect(formatShortcut("Command+Shift+Foo", "Macintosh")).toBe("⇧ ⌘ Foo");
    expect(formatShortcut("Command", "Macintosh")).toBe("Command");
  });
});
