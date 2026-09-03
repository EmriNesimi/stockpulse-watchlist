import { prisma } from "./db";

// No longer used by routes now that auth is real (see src/routes/auth.ts,
// which passes the signed-in user's own id) — kept only as a stand-in
// user id for tests that need a watchlist but aren't testing auth itself.
export const DEFAULT_USER_ID = "test-fixture-user";

// Upsert rather than find-then-create. Watchlist.userId is unique and this is
// called independently from every watchlist and alerts route, so two requests
// arriving together for a user who has no watchlist yet — a client loading the
// dashboard and the alerts list at once, which is just normal page load — could
// both see nothing, both insert, and hand the loser a P2002 that nothing caught
// and the user saw as a 500 on their first ever visit.
//
// The empty `update` is deliberate: there is nothing to change on a row that
// already exists, and it makes Postgres resolve the conflict rather than us.
export async function getOrCreateWatchlist(userId: string) {
  return prisma.watchlist.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}
