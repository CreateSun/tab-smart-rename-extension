/**
 * Chrome reports shortcuts as English key names ("Command+Shift+E"). macOS
 * users expect symbol order, so render Mac bindings as "⇧ ⌘ E" instead.
 */
type Modifier = { symbol: string; order: number };

const MODIFIERS: Record<string, Modifier> = {
  control: { symbol: "⌃", order: 0 },
  ctrl: { symbol: "⌃", order: 0 },
  macctrl: { symbol: "⌃", order: 0 },
  option: { symbol: "⌥", order: 1 },
  alt: { symbol: "⌥", order: 1 },
  shift: { symbol: "⇧", order: 2 },
  command: { symbol: "⌘", order: 3 },
  cmd: { symbol: "⌘", order: 3 }
};

export function formatShortcut(value: string, userAgent?: string): string {
  const agent = userAgent ?? (typeof navigator === "undefined" ? "" : navigator.userAgent);
  if (!/Mac|iPhone|iPad/.test(agent)) return value;
  const parts = value.split("+").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return value;
  const key = parts.at(-1)!;
  const modifiers: Modifier[] = [];
  for (const part of parts.slice(0, -1)) {
    const modifier = MODIFIERS[part.toLowerCase()];
    if (!modifier) return value;
    modifiers.push(modifier);
  }
  const symbols = modifiers.sort((left, right) => left.order - right.order).map((modifier) => modifier.symbol);
  return [...symbols, key.length === 1 ? key.toUpperCase() : key].join(" ");
}
