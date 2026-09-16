document.querySelector<HTMLButtonElement>("#start")!.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "COMPLETE_ONBOARDING" });
  window.close();
});
