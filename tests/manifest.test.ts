import { describe, expect, it } from "vitest";
import manifest from "../manifest.json";

describe("extension entry contract", () => {
  it("uses the page overlay instead of an action popup", () => expect("default_popup" in manifest.action).toBe(false));
  it("suggests Alt Shift R without conflicting with Chrome hard reload", () => {
    expect(manifest.commands._execute_action.suggested_key.mac).toBe("Alt+Shift+R");
    expect(manifest.commands._execute_action.suggested_key.default).toBe("Alt+Shift+R");
  });
});
