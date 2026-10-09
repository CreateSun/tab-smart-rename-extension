import type { StoredStateV1 } from "../domain/types";
import { normalizeLanguage, translate, type MessageKey } from "../shared/i18n";
const shortcutLabel = document.querySelector<HTMLElement>("#shortcutLabel");
const shortcutStatus = document.querySelector<HTMLElement>("#shortcutStatus");
type Language = StoredStateV1["settings"]["language"];
let language: Language = "en";
const t = (key: MessageKey, params: Record<string, string | number> = {}) => translate(language, key, params);
function applyLanguage(): void {
  document.documentElement.lang = language === "zh_CN" ? "zh-CN" : "en";
  for (const [id, key] of [["localOnly", "onboarding.local"], ["installed", "onboarding.installed"], ["lead", "onboarding.lead"], ["webpageTip", "onboarding.webpageTip"], ["shortcutFastest", "onboarding.fastest"], ["privacyNote", "onboarding.privacy"], ["stepsTitle", "onboarding.steps"], ["demoEyebrow", "onboarding.demoEyebrow"], ["demoTitle", "onboarding.demoTitle"], ["demoHelp", "onboarding.demoHelp"], ["demoAlt", "onboarding.demoAlt"], ["demoOverlayTitle", "onboarding.demoOverlayTitle"], ["demoNameLabel", "onboarding.demoNameLabel"], ["demoSource", "onboarding.demoSource"], ["demoOriginal", "onboarding.demoOriginal"], ["demoTabOriginal", "onboarding.demoOriginal"], ["demoInputOriginal", "onboarding.demoOriginal"], ["demoTabRenamed", "onboarding.demoTabRenamed"], ["demoInputRenamed", "onboarding.demoTabRenamed"], ["demoPersistence", "onboarding.demoPersistence"], ["demoScope", "onboarding.demoScope"], ["demoRestore", "onboarding.demoRestore"], ["demoSave", "onboarding.demoSave"], ["demoStatus", "onboarding.demoStatus"], ["googleTest", "onboarding.googleTest"]] as const) { const element = document.getElementById(id); if (element) element.textContent = t(key); }
  document.getElementById("steps")?.setAttribute("aria-label", t("onboarding.steps"));
  const headline = document.getElementById("headline"); if (headline) headline.innerHTML = t("onboarding.headline").split("\n").join("<br>");
  for (const [id, key] of [["step1", "onboarding.step1"], ["step1Help", "onboarding.step1Help"], ["step2", "onboarding.step2"], ["step2Help", "onboarding.step2Help"], ["step3", "onboarding.step3"], ["step3Help", "onboarding.step3Help"]] as const) { const element = document.getElementById(id); if (element) element.textContent = t(key); }
  const checkShortcut = document.querySelector<HTMLButtonElement>("#checkShortcut"); if (checkShortcut) checkShortcut.textContent = t("onboarding.openShortcuts");
  const start = document.querySelector<HTMLButtonElement>("#start"); if (start) start.innerHTML = `${t("onboarding.continue")} <span>→</span>`;
  const languageToggle = document.querySelector<HTMLElement>("#language-toggle"); if (languageToggle) { languageToggle.setAttribute("aria-label", t("language.label")); for (const button of Array.from(languageToggle.querySelectorAll<HTMLButtonElement>("[data-language]"))) { const label = button.dataset.language === "en" ? t("language.en") : t("language.zh_CN"); button.setAttribute("aria-pressed", String(button.dataset.language === language)); button.setAttribute("aria-label", label); button.title = label; button.textContent = button.dataset.language === "en" ? "EN" : "中文"; } }
  document.title = t("onboarding.title");
}
const formatShortcut = (value: string): string => {
  const normalized = value.toLowerCase().replaceAll(" ", "");
  const usesCommand = normalized.includes("command") || normalized.includes("macctrl") || value.includes("⌘");
  const usesShift = normalized.includes("shift") || value.includes("⇧");
  const usesR = normalized.split("+").at(-1) === "r" || /r$/i.test(normalized.replace(/[⌘⇧]/g, ""));
  return usesCommand && usesShift && usesR ? "⇧ ⌘ R" : value;
};

async function inspectShortcut(openSettings = false): Promise<void> {
  const command = (await chrome.commands.getAll()).find((item) => item.name === "_execute_action");
  const assigned = command?.shortcut?.trim();
  if (shortcutLabel) shortcutLabel.textContent = assigned ? formatShortcut(assigned) : t("onboarding.shortcutMissing");
  if (shortcutStatus) {
    shortcutStatus.textContent = assigned
      ? t("onboarding.assigned", { shortcut: assigned })
      : t("onboarding.shortcutHelp");
    shortcutStatus.classList.toggle("needs-action", !assigned);
  }
  if (openSettings) await chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
}

document.querySelector<HTMLButtonElement>("#checkShortcut")?.addEventListener("click", () => void inspectShortcut(true));
document.querySelector<HTMLElement>("#language-toggle")?.addEventListener("click", async (event) => { const target = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-language]"); if (!target) return; language = normalizeLanguage(target.dataset.language); await chrome.runtime.sendMessage({ type: "SET_LANGUAGE", language }); applyLanguage(); await inspectShortcut(); });
document.querySelector<HTMLButtonElement>("#googleTest")?.addEventListener("click", () => void chrome.tabs.create({ url: "https://www.google.com/" }));
document.querySelector<HTMLButtonElement>("#start")?.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "COMPLETE_ONBOARDING" });
  const tab = await chrome.tabs.getCurrent();
  if (tab?.id) await chrome.tabs.remove(tab.id); else window.close();
});
async function load(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({ type: "LIST_STATE" });
    language = normalizeLanguage((response?.data as StoredStateV1 | undefined)?.settings?.language);
  } catch { language = "en"; }
  applyLanguage();
  await inspectShortcut();
}
void load();
