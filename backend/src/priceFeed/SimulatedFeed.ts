import { env } from "../env";
import type { PriceFeed, PriceTick, Unsubscribe } from "./PriceFeed";

const TICK_INTERVAL_MS = 1500;
const MAX_STEP_PCT = 0.002; // 0.2% per tick, keeps the walk plausible-looking

interface SymbolState {
  basePrice: number; // yesterday's close, so % change means something
  price: number;
  subscribers: Set<(tick: PriceTick) => void>;
  timer: ReturnType<typeof setInterval>;
}

// Deterministic per-symbol starting price so the same ticker always starts
// in a sane, plausible range across restarts (no API key needed for this).
function fallbackBasePrice(symbol: string): number {
  let hash = 0;
  for (const char of symbol) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return 20 + (hash % 480); // roughly $20-$500
}

async function fetchPreviousClose(symbol: string): Promise<number | null> {
  if (!env.polygonApiKey) return null;
  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${env.polygonApiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const body = (await res.json()) as { results?: Array<{ c: number }> };
    return body.results?.[0]?.c ?? null;
  } catch {
    return null; // fine, we'll just use the deterministic fallback
  }
}

export class SimulatedFeed implements PriceFeed {
  private symbols = new Map<string, SymbolState>();

  subscribe(symbol: string, onTick: (tick: PriceTick) => void): Unsubscribe {
    let state = this.symbols.get(symbol);

    if (!state) {
      state = {
        basePrice: fallbackBasePrice(symbol), // replaced below once/if the real quote resolves
        price: fallbackBasePrice(symbol),
        subscribers: new Set(),
        timer: setInterval(() => this.tick(symbol), TICK_INTERVAL_MS),
      };
      this.symbols.set(symbol, state);

      fetchPreviousClose(symbol).then((close) => {
        const current = this.symbols.get(symbol);
        if (current && close && close > 0) {
          current.basePrice = close;
          current.price = close;
        }
      });
    }

    state.subscribers.add(onTick);

    return () => {
      const current = this.symbols.get(symbol);
      if (!current) return;
      current.subscribers.delete(onTick);
      if (current.subscribers.size === 0) {
        clearInterval(current.timer);
        this.symbols.delete(symbol);
      }
    };
  }

  private tick(symbol: string) {
    const state = this.symbols.get(symbol);
    if (!state) return;

    const step = (Math.random() * 2 - 1) * MAX_STEP_PCT;
    state.price = Math.max(0.01, state.price * (1 + step));

    const changePercent = ((state.price - state.basePrice) / state.basePrice) * 100;

    const tick: PriceTick = {
      symbol,
      price: Math.round(state.price * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      timestamp: Date.now(),
      source: "simulated",
    };

    for (const subscriber of state.subscribers) subscriber(tick);
  }
}
