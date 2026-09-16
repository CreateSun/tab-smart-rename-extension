import { TitleController } from "./controller";
import { RenameOverlay } from "./overlay";
import type { ContentRequest } from "../shared/messages";

const scope = globalThis as typeof globalThis & { __tabRenameController?: TitleController };
const controller = scope.__tabRenameController ?? new TitleController();
if (!scope.__tabRenameController) { scope.__tabRenameController = controller; controller.start(); }
const overlayScope = globalThis as typeof globalThis & { __tabRenameOverlay?: RenameOverlay };
const overlay = overlayScope.__tabRenameOverlay ?? new RenameOverlay();
overlayScope.__tabRenameOverlay = overlay;

chrome.runtime.onMessage.addListener((request: ContentRequest, _sender, sendResponse) => {
  switch (request.type) {
    case "GET_PAGE_STATE": sendResponse(controller.getState()); break;
    case "SET_PAGE_OVERRIDE":
      controller.setPageOverride(request.suppress ? { kind: "suppress" } : request.name === null ? null : { kind: "name", name: request.name });
      sendResponse(controller.getState());
      break;
    case "APPLY_DECISION": controller.apply(request.name, request.debounceMs); sendResponse({ ok: true }); break;
    case "CLEAR_DECISION": controller.clear(); sendResponse({ ok: true }); break;
    case "OPEN_RENAME_OVERLAY": overlay.open(); sendResponse({ ok: true }); break;
  }
  return false;
});
