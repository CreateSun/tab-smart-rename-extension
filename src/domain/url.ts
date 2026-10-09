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

const captureReference = /\{([1-9][0-9]*)\}|\$([1-9][0-9]*)/g;
const patternCapture = /\{([1-9][0-9]*)(\*)?\}/;
const patternCaptureGlobal = /\{([1-9][0-9]*)(\*)?\}/g;

export function normalizeUrlPattern(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const pattern = input.trim();
  if (!pattern || pattern.length > 2_048 || /[\r\n]/.test(pattern)) return null;
  try { new RegExp("^(?:" + patternToRegex(pattern) + ")$"); return pattern; } catch { return null; }
}

export function matchUrlPattern(pattern: string, rawUrl: string): RegExpExecArray | null {
  const normalizedUrl = normalizeExactUrl(rawUrl);
  if (!normalizedUrl) return null;
  try { return new RegExp("^(?:" + patternToRegex(pattern) + ")$").exec(normalizedUrl); } catch { return null; }
}

function patternToRegex(pattern: string): string {
  if (patternCapture.test(pattern)) {
    return pattern.split(/(\{[1-9][0-9]*\*?\})/).map((segment) =>
      patternCapture.test(segment) ? (segment.endsWith("*}") ? "([^?#]+)" : "([^/?#]+)") : escapeRegex(segment).replace(/\\\.\\\*/g, ".*").replace(/\\\*/g, "[^/]*")
    ).join("");
  }
  return pattern.replace(patternCaptureGlobal, (_token, _index: string, wide: string | undefined) => wide ? "([^?#]+)" : "([^/?#]+)");
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function interpolateUrlPatternName(template: string, captures: RegExpExecArray): string {
  return template.replace(captureReference, (token, braceIndex, dollarIndex) => {
    const index = Number(braceIndex ?? dollarIndex);
    const value = captures[index];
    return value === undefined ? token : decodeUrlComponent(value);
  });
}

function decodeUrlComponent(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}

export function matcherKey(match: { kind: "exact-url" | "url-pattern" | "host"; value: string }): string {
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
