export function parseSupportedUrl(rawUrl: string): URL | null {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function normalizeExactUrl(rawUrl: string): string | null {
  const url = parseSupportedUrl(rawUrl);
  if (!url) return null;
  url.hash = "";
  return url.href;
}

export function normalizeHostname(rawUrlOrHost: string): string | null {
  const parsed = parseSupportedUrl(rawUrlOrHost);
  if (parsed) return parsed.hostname.toLowerCase();
  try {
    return new URL(`https://${rawUrlOrHost}`).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

export function matcherKey(match: { kind: "exact-url" | "host"; value: string }): string {
  return `${match.kind}:${match.value}`;
}

export function isRestrictedUrl(rawUrl: string): boolean {
  if (/^(chrome|edge|about|chrome-extension|moz-extension):/i.test(rawUrl)) return true;
  try {
    const url = new URL(rawUrl);
    return url.hostname === "chromewebstore.google.com" || url.hostname === "chrome.google.com" && url.pathname.startsWith("/webstore");
  } catch {
    return true;
  }
}
