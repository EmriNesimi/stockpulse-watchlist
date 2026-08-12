import { prisma } from "./db";

// No longer used by routes now that auth is real (see src/routes/auth.ts,
// which passes the signed-in user's own id) — kept only as a stand-in
// user id for tests that need a watchlist but aren't testing auth itself.
export const DEFAULT_USER_ID = "test-fixture-user";

export async function getOrCreateWatchlist(userId: string) {
  const existing = await prisma.watchlist.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.watchlist.create({ data: { userId } });
}
