import { TitleController } from "./controller";
import { RenameOverlay } from "./overlay";
import type { ContentRequest } from "../shared/messages";

type ContentScope = typeof globalThis & {
  __tabRenameController?: TitleController;
  __tabRenameOverlay?: RenameOverlay;
  __tabRenameOpenOverlay?: () => void;
  __tabRenameOverlayPending?: boolean;
  __tabRenameListenerInstalled?: boolean;
};

const scope = globalThis as ContentScope;
const controller = scope.__tabRenameController ?? new TitleController();
if (!scope.__tabRenameController) { scope.__tabRenameController = controller; controller.start(); }
const overlay = scope.__tabRenameOverlay ?? new RenameOverlay();
scope.__tabRenameOverlay = overlay;
scope.__tabRenameOpenOverlay = () => { void overlay.open(); };

if (!scope.__tabRenameListenerInstalled) {
  chrome.runtime.onMessage.addListener((request: ContentRequest, _sender, sendResponse) => {
    switch (request.type) {
      case "GET_PAGE_STATE": sendResponse(controller.getState()); break;
      case "SET_PAGE_OVERRIDE":
        controller.setPageOverride(request.suppress ? { kind: "suppress", icon: null } : request.name === null ? null : { kind: "name", name: request.name, icon: request.icon });
        sendResponse(controller.getState());
        break;
      case "APPLY_DECISION": controller.apply(request.name, request.icon ?? null, request.debounceMs, request.originalIcon); sendResponse({ ok: true }); break;
      case "CLEAR_DECISION": controller.clear(); sendResponse({ ok: true }); break;
      case "OPEN_RENAME_OVERLAY": void overlay.open(); sendResponse({ ok: true }); break;
    }
    return false;
  });
  scope.__tabRenameListenerInstalled = true;
}

if (scope.__tabRenameOverlayPending) {
  scope.__tabRenameOverlayPending = false;
  void overlay.open();
}
