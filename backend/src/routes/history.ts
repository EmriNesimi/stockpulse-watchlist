import { Router } from "express";
import { env } from "../env";
import { asyncHandler } from "../asyncHandler";
import { symbolSchema } from "./watchlist.schemas";
import { historyQuerySchema } from "./history.schemas";
import { tryConsumeMassiveQuota } from "../massive/rateLimiter";
import { fetchMassiveHistory } from "../massive/fetchHistory";
import { generateSimulatedHistory } from "../priceFeed/simulatedHistory";

const router = Router();

router.get(
  "/:symbol",
  asyncHandler(async (req, res) => {
    const symbolParsed = symbolSchema.safeParse(req.params.symbol);
    if (!symbolParsed.success) {
      return res.status(400).json({ error: symbolParsed.error.issues[0]?.message ?? "Invalid symbol" });
    }

    const queryParsed = historyQuerySchema.safeParse(req.query);
    if (!queryParsed.success) {
      return res.status(400).json({ error: "Invalid days parameter (must be 7-365)" });
    }

    const symbol = symbolParsed.data;
    const { days } = queryParsed.data;

    if (env.massiveApiKey && tryConsumeMassiveQuota()) {
      const real = await fetchMassiveHistory(symbol, days);
      if (real) {
        return res.json({ candles: real, source: "massive" });
      }
    }

    res.json({ candles: generateSimulatedHistory(symbol, days), source: "simulated" });
  })
);

export default router;
