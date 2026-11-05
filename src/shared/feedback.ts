/**
 * Optional feedback form. It only opens after an explicit user action; the
 * extension never loads this URL on its own.
 */
export const FEEDBACK_FORM_URL = "https://tally.so/r/BEK405";

export type FeedbackSource =
  | "uninstall"
  | "onboarding_footer"
  | "options_footer"
  | "options_rule_guide"
  | "options_permission"
  | "options_import"
  | "options_rule_test";

function extensionVersion(): string {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return "";
  }
}

/**
 * The source is a Tally hidden field so we can tell which entry point worked.
 * Only the entry name and extension version are sent; never page titles, URLs,
 * or rule contents.
 */
export function feedbackUrl(source: FeedbackSource): string {
  const parameters = new URLSearchParams({ source });
  const version = extensionVersion();
  if (version) parameters.set("v", version);
  return `${FEEDBACK_FORM_URL}?${parameters.toString()}`;
}
