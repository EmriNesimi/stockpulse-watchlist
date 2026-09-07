import { env } from "../env";
import { logger } from "../logger";
import { tryConsumeMassiveQuota } from "../massive/rateLimiter";

export async function fetchPreviousClose(symbol: string): Promise<number | null> {
  if (!env.massiveApiKey) return null;
  if (!tryConsumeMassiveQuota()) {
    logger.warn("skipping previous-close lookup, Massive quota reached", { symbol, quotaPerMin: 5 });
    return null;
  }
  try {
    const url = `https://api.massive.com/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${env.massiveApiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const body = (await res.json()) as { results?: Array<{ c: number }> };
    return body.results?.[0]?.c ?? null;
  } catch {
    return null;
  }
}
