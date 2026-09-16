const shortcutLabel = document.querySelector<HTMLElement>("#shortcutLabel")!;
const shortcutStatus = document.querySelector<HTMLElement>("#shortcutStatus")!;
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
  shortcutLabel.textContent = assigned ? formatShortcut(assigned) : "尚未分配";
  shortcutStatus.textContent = assigned
    ? `Chrome 当前已分配：${assigned}。在普通网页按下即可打开命名界面。`
    : "Chrome 未分配建议快捷键，通常是因为与浏览器保留快捷键冲突。请在快捷键页手动设置。";
  shortcutStatus.classList.toggle("needs-action", !assigned);
  if (openSettings) await chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
}

document.querySelector<HTMLButtonElement>("#checkShortcut")!.addEventListener("click", () => void inspectShortcut(true));
document.querySelector<HTMLButtonElement>("#start")!.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "COMPLETE_ONBOARDING" });
  const tab = await chrome.tabs.getCurrent();
  if (tab?.id) await chrome.tabs.remove(tab.id); else window.close();
});
void inspectShortcut();
