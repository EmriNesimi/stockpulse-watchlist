import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler } from "../asyncHandler";
import { getOrCreateWatchlist } from "../watchlistHelper";
import { alertIdSchema, createAlertSchema } from "./alerts.schemas";

const router = Router();

// requireAuth runs in front of this whole router (see app.ts), so
// req.userId is always set here.

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const watchlist = await getOrCreateWatchlist(req.userId!);
    // Explicit for the same reason as the watchlist list: without ORDER BY the
    // order is whatever plan Postgres happened to pick, and there's an index
    // on watchlistId here that could start being used at any size.
    //
    // Ascending because that's what it already returns. Newest-first might
    // read better, but that's a change to what users see and it isn't one
    // this commit is for.
    const alerts = await prisma.priceAlert.findMany({
      where: { watchlistId: watchlist.id },
      orderBy: { createdAt: "asc" },
    });
    res.json({ alerts });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createAlertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" });
    }

    const watchlist = await getOrCreateWatchlist(req.userId!);
    const alert = await prisma.priceAlert.create({
      data: {
        symbol: parsed.data.symbol,
        threshold: parsed.data.threshold,
        direction: parsed.data.direction,
        watchlistId: watchlist.id,
      },
    });
    res.status(201).json({ alert });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = alertIdSchema.safeParse(req.params.id);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid alert id" });
    }

    const watchlist = await getOrCreateWatchlist(req.userId!);
    const result = await prisma.priceAlert.deleteMany({
      where: { id: parsed.data, watchlistId: watchlist.id },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "No alert with that id" });
    }
    res.status(204).send();
  })
);

export default router;
