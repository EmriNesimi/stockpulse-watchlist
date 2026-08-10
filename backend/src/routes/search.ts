import { Router } from "express";
import { env } from "../env";
import { asyncHandler } from "../asyncHandler";
import { FALLBACK_TICKERS } from "../massive/fallbackTickers";
import { tryConsumeMassiveQuota } from "../massive/rateLimiter";
import { searchQuerySchema } from "./search.schemas";

const router = Router();

interface TickerResult {
  symbol: string;
  name: string;
}

async function searchMassive(query: string): Promise<TickerResult[]> {
  const url = new URL("https://api.massive.com/v3/reference/tickers");
  url.searchParams.set("search", query);
  url.searchParams.set("active", "true");
  url.searchParams.set("market", "stocks");
  url.searchParams.set("limit", "10");
  url.searchParams.set("apiKey", env.massiveApiKey!);

  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) {
    throw new Error(`Massive search failed with status ${res.status}`);
  }
  const body = (await res.json()) as { results?: Array<{ ticker: string; name: string }> };
  return (body.results ?? []).map((r) => ({ symbol: r.ticker, name: r.name }));
}

function searchFallback(query: string): TickerResult[] {
  const needle = query.toUpperCase();
  return FALLBACK_TICKERS.filter(
    (t) => t.symbol.includes(needle) || t.name.toUpperCase().includes(needle)
  ).slice(0, 10);
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Query param 'q' is required" });
    }

    if (!env.massiveApiKey) {
      return res.json({ results: searchFallback(parsed.data.q), source: "fallback" });
    }

    // Free-tier Massive accounts are capped at 5 REST calls/min — don't burn
    // quota on search-as-you-type if we're near the limit, just serve the
    // static list for this request instead.
    if (!tryConsumeMassiveQuota()) {
      return res.json({ results: searchFallback(parsed.data.q), source: "fallback" });
    }

    try {
      const results = await searchMassive(parsed.data.q);
      res.json({ results, source: "massive" });
    } catch (err) {
      // Don't take the whole search feature down if Massive has a bad day —
      // fall back to the static list rather than erroring out.
      console.error("Massive search failed, falling back to static list:", err);
      res.json({ results: searchFallback(parsed.data.q), source: "fallback" });
    }
  })
);

export default router;
