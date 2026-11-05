import { describe, expect, it } from "vitest";
import manifest from "../manifest.json";

describe("extension entry contract", () => {
  it("uses the page overlay instead of an action popup", () => expect("default_popup" in manifest.action).toBe(false));
  it("suggests Cmd Shift E on macOS and Ctrl Shift E elsewhere", () => {
    expect(manifest.commands._execute_action.suggested_key.mac).toBe("Command+Shift+E");
    expect(manifest.commands._execute_action.suggested_key.default).toBe("Ctrl+Shift+E");
  });
});
