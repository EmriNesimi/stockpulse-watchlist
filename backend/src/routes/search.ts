import { Router } from "express";
import { z } from "zod";
import { env } from "../env";
import { asyncHandler } from "../asyncHandler";
import { FALLBACK_TICKERS } from "../polygon/fallbackTickers";

const router = Router();

const querySchema = z.object({
  q: z.string().trim().min(1).max(50),
});

interface TickerResult {
  symbol: string;
  name: string;
}

async function searchPolygon(query: string): Promise<TickerResult[]> {
  const url = new URL("https://api.polygon.io/v3/reference/tickers");
  url.searchParams.set("search", query);
  url.searchParams.set("active", "true");
  url.searchParams.set("market", "stocks");
  url.searchParams.set("limit", "10");
  url.searchParams.set("apiKey", env.polygonApiKey!);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Polygon search failed with status ${res.status}`);
    }
    const body = (await res.json()) as { results?: Array<{ ticker: string; name: string }> };
    return (body.results ?? []).map((r) => ({ symbol: r.ticker, name: r.name }));
  } finally {
    clearTimeout(timeout);
  }
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
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Query param 'q' is required" });
    }

    if (!env.polygonApiKey) {
      return res.json({ results: searchFallback(parsed.data.q), source: "fallback" });
    }

    try {
      const results = await searchPolygon(parsed.data.q);
      res.json({ results, source: "polygon" });
    } catch (err) {
      // Don't take the whole search feature down if Polygon has a bad day —
      // fall back to the static list rather than erroring out.
      console.error("Polygon search failed, falling back to static list:", err);
      res.json({ results: searchFallback(parsed.data.q), source: "fallback" });
    }
  })
);

export default router;
