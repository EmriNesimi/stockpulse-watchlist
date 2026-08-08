import { deterministicBasePrice } from "./deterministicBasePrice";

export interface Candle {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const MAX_DAILY_STEP_PCT = 0.03; // up to ~3% close-to-close move per simulated day

/**
 * Deterministic-seed, pseudo-random daily candles ending today. Not trying
 * to be statistically realistic (no drift/volatility modeling) — just
 * plausible-looking OHLC bars so the chart has something real to render
 * when there's no Massive entitlement for historical aggregates.
 */
export function generateSimulatedHistory(symbol: string, days: number): Candle[] {
  const candles: Candle[] = [];
  let close = deterministicBasePrice(symbol);

  // Simple seeded PRNG so re-requesting the same symbol/day count is stable
  // within a process run, instead of a different random chart every call.
  let seed = 0;
  for (const char of symbol) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  function random() {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return seed / 0xffffffff;
  }

  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const open = close;
    const step = (random() * 2 - 1) * MAX_DAILY_STEP_PCT;
    close = Math.max(0.01, open * (1 + step));
    const high = Math.max(open, close) * (1 + random() * 0.01);
    const low = Math.min(open, close) * (1 - random() * 0.01);
    const volume = Math.round(1_000_000 + random() * 5_000_000);

    candles.push({
      time: date.toISOString().slice(0, 10),
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      volume,
    });
  }

  return candles;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
