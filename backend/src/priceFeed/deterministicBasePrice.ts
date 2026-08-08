// Deterministic per-symbol starting price so the same ticker always starts
// in a sane, plausible range across restarts (no API key needed for this).
// Shared between SimulatedFeed (live ticks) and the simulated history
// generator (candles) so a symbol's simulated price and its simulated
// chart agree with each other instead of drifting from independent seeds.
export function deterministicBasePrice(symbol: string): number {
  let hash = 0;
  for (const char of symbol) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return 20 + (hash % 480); // roughly $20-$500
}
