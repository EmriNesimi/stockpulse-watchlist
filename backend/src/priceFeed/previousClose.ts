import { env } from "../env";
import { logger } from "../logger";
import {
  MAX_CALLS_PER_WINDOW,
  tryConsumeMassiveQuota,
} from "../massive/rateLimiter";

export async function fetchPreviousClose(
  symbol: string
): Promise<number | null> {
  if (!env.massiveApiKey) return null;
  if (!tryConsumeMassiveQuota()) {
    logger.warn("skipping previous-close lookup, Massive quota reached", {
      symbol,
      quotaPerMin: MAX_CALLS_PER_WINDOW,
    });
    return null;
  }
  try {
    const url = `https://api.massive.com/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${env.massiveApiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      logger.warn("previous-close lookup rejected by Massive", { symbol, status: res.status });
      return null;
    }
    const body = (await res.json()) as { results?: Array<{ c: number }> };
    // An empty result set isn't a failure: a freshly listed symbol has no
    // prior session to report. Only the error paths are worth a line.
    return body.results?.[0]?.c ?? null;
  } catch (err) {
    logger.warn("previous-close lookup failed", { symbol, err });
    return null;
  }
}
