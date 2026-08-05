import { prisma } from "./db";

// "default-user" until there's ever a real login — every route that needs
// the single watchlist (items, alerts) shares this instead of each
// reimplementing get-or-create.
export const DEFAULT_USER_ID = "default-user";

export async function getOrCreateWatchlist(userId: string) {
  const existing = await prisma.watchlist.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.watchlist.create({ data: { userId } });
}
