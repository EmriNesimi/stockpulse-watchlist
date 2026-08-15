const HUE_COUNT = 6;

// Deterministic: the same symbol always gets the same avatar color, so it
// stays recognizable across renders instead of shuffling on every reload.
export function tickerAvatarHue(symbol: string): string {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0;
  }
  const index = (hash % HUE_COUNT) + 1;
  return `var(--avatar-hue-${index})`;
}
