import { env } from "../env";
import type { Candle } from "../priceFeed/simulatedHistory";

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Real daily OHLC bars from Massive's aggregates endpoint. Returns null
 * (rather than throwing) on any failure — callers fall back to the
 * simulated generator, same pattern as ticker search and previousClose.
 */
export async function fetchMassiveHistory(symbol: string, days: number): Promise<Candle[] | null> {
  if (!env.massiveApiKey) return null;

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);

  const url = new URL(
    `https://api.massive.com/v2/aggs/ticker/${symbol}/range/1/day/${formatDate(from)}/${formatDate(to)}`
  );
  url.searchParams.set("adjusted", "true");
  url.searchParams.set("sort", "asc");
  url.searchParams.set("limit", "365");
  url.searchParams.set("apiKey", env.massiveApiKey);

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const body = (await res.json()) as {
      results?: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>;
    };
    if (!body.results || body.results.length === 0) return null;

    return body.results.map((bar) => ({
      time: formatDate(new Date(bar.t)),
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
    }));
  } catch {
    return null;
  }
}
