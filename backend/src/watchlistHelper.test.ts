import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "./db";
import { getOrCreateWatchlist } from "./watchlistHelper";

const USER_ID = "race-probe-user";

afterEach(async () => {
  await prisma.watchlistItem.deleteMany();
  await prisma.watchlist.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function makeUser() {
  await prisma.user.create({
    data: { id: USER_ID, email: "race@example.com", passwordHash: "not-a-real-hash" },
  });
}

describe("getOrCreateWatchlist", () => {
  it("creates one on first call and returns the same one after", async () => {
    await makeUser();

    const first = await getOrCreateWatchlist(USER_ID);
    const second = await getOrCreateWatchlist(USER_ID);

    expect(second.id).toBe(first.id);
    expect(await prisma.watchlist.count()).toBe(1);
  });

  // The bug this replaced: find-then-create let two concurrent callers both
  // see nothing and both insert, and the loser got a unique-constraint error
  // that surfaced as a 500. The dashboard loads the watchlist and the alerts
  // list at the same time, so this is ordinary traffic, not an attack.
  it("survives concurrent callers for a user with no watchlist yet", async () => {
    await makeUser();

    const results = await Promise.all(
      Array.from({ length: 5 }, () => getOrCreateWatchlist(USER_ID))
    );

    const ids = new Set(results.map((w) => w.id));
    expect(ids.size).toBe(1);
    expect(await prisma.watchlist.count()).toBe(1);
  });
});
