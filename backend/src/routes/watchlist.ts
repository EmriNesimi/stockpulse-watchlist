import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { asyncHandler } from "../asyncHandler";
import { symbolSchema, addItemSchema, updateHoldingsSchema } from "./watchlist.schemas";
import { getOrCreateWatchlist } from "../watchlistHelper";
import { MAX_SYMBOLS_PER_CLIENT } from "../wsLimits";

const router = Router();

// requireAuth runs in front of this whole router (see app.ts), so
// req.userId is always set here.

router.get("/", asyncHandler(async (req, res) => {
  const watchlist = await getOrCreateWatchlist(req.userId!);
  const items = await prisma.watchlistItem.findMany({ where: { watchlistId: watchlist.id } });
  res.json({ items });
}));

router.post("/", asyncHandler(async (req, res) => {
  const parsed = addItemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" });
  }

  const watchlist = await getOrCreateWatchlist(req.userId!);

  const itemCount = await prisma.watchlistItem.count({ where: { watchlistId: watchlist.id } });
  if (itemCount >= MAX_SYMBOLS_PER_CLIENT) {
    return res.status(409).json({
      error: `Watchlist is full — a single connection can only track ${MAX_SYMBOLS_PER_CLIENT} tickers at once. Remove one before adding another.`,
    });
  }

  try {
    const item = await prisma.watchlistItem.create({
      data: {
        symbol: parsed.data.symbol,
        name: parsed.data.name,
        shares: parsed.data.shares,
        costBasis: parsed.data.costBasis,
        watchlistId: watchlist.id,
      },
    });
    res.status(201).json({ item });
  } catch (err) {
    // Prisma unique constraint violation -> symbol's already on the list
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return res.status(409).json({ error: `${parsed.data.symbol} is already on the watchlist` });
    }
    throw err;
  }
}));

router.patch("/:symbol", asyncHandler(async (req, res) => {
  const symbolParsed = symbolSchema.safeParse(req.params.symbol);
  if (!symbolParsed.success) {
    return res.status(400).json({ error: symbolParsed.error.issues[0]?.message ?? "Invalid symbol" });
  }
  const bodyParsed = updateHoldingsSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({ error: bodyParsed.error.issues[0]?.message ?? "Invalid request body" });
  }

  const watchlist = await getOrCreateWatchlist(req.userId!);

  try {
    const item = await prisma.watchlistItem.update({
      where: { watchlistId_symbol: { watchlistId: watchlist.id, symbol: symbolParsed.data } },
      data: { shares: bodyParsed.data.shares, costBasis: bodyParsed.data.costBasis },
    });
    res.json({ item });
  } catch (err) {
    // Prisma throws P2025 rather than returning null when the row targeted
    // by a unique `where` doesn't exist.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return res.status(404).json({ error: `${symbolParsed.data} isn't on the watchlist` });
    }
    throw err;
  }
}));

router.delete("/:symbol", asyncHandler(async (req, res) => {
  const parsed = symbolSchema.safeParse(req.params.symbol);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid symbol" });
  }

  const watchlist = await getOrCreateWatchlist(req.userId!);
  const result = await prisma.watchlistItem.deleteMany({
    where: { watchlistId: watchlist.id, symbol: parsed.data },
  });

  if (result.count === 0) {
    return res.status(404).json({ error: `${parsed.data} isn't on the watchlist` });
  }
  res.status(204).send();
}));

export default router;
