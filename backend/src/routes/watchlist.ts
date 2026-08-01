import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler } from "../asyncHandler";
import { symbolSchema, addItemSchema } from "./watchlist.schemas";

const router = Router();

async function getOrCreateWatchlist(userId: string) {
  const existing = await prisma.watchlist.findUnique({
    where: { userId },
    include: { items: true },
  });
  if (existing) return existing;

  return prisma.watchlist.create({
    data: { userId },
    include: { items: true },
  });
}

const DEFAULT_USER_ID = "default-user";

router.get("/", asyncHandler(async (_req, res) => {
  const watchlist = await getOrCreateWatchlist(DEFAULT_USER_ID);
  res.json({ items: watchlist.items });
}));

router.post("/", asyncHandler(async (req, res) => {
  const parsed = addItemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" });
  }

  const watchlist = await getOrCreateWatchlist(DEFAULT_USER_ID);

  try {
    const item = await prisma.watchlistItem.create({
      data: {
        symbol: parsed.data.symbol,
        name: parsed.data.name,
        watchlistId: watchlist.id,
      },
    });
    res.status(201).json({ item });
  } catch (err: any) {
    // Prisma unique constraint violation -> symbol's already on the list
    if (err?.code === "P2002") {
      return res.status(409).json({ error: `${parsed.data.symbol} is already on the watchlist` });
    }
    throw err;
  }
}));

router.delete("/:symbol", asyncHandler(async (req, res) => {
  const parsed = symbolSchema.safeParse(req.params.symbol);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid symbol" });
  }

  const watchlist = await getOrCreateWatchlist(DEFAULT_USER_ID);
  const result = await prisma.watchlistItem.deleteMany({
    where: { watchlistId: watchlist.id, symbol: parsed.data },
  });

  if (result.count === 0) {
    return res.status(404).json({ error: `${parsed.data} isn't on the watchlist` });
  }
  res.status(204).send();
}));

export default router;
