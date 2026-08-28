import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../db";

// Exercises the real route handlers end to end (Express + zod + Prisma)
// against a throwaway Postgres db (see vitest.config.ts / test/globalSetup.ts)
// — not mocks. This is what actually catches wiring bugs the unit tests on
// the schemas alone can't see.
const app = createApp();

// The watchlist routes require a signed-in user (see requireAuth in
// app.ts), so every test signs up fresh and reuses the resulting session
// cookie via a supertest agent instead of hitting the routes directly.
let agent: ReturnType<typeof request.agent>;

beforeEach(async () => {
  agent = request.agent(app);
  await agent.post("/api/auth/signup").send({ email: "watchlist-test@example.com", password: "test-password" });
  // signup no longer returns a session - log in to get one
  await agent.post("/api/auth/login").send({ email: "watchlist-test@example.com", password: "test-password" });
});

afterEach(async () => {
  // Isolate tests from each other without needing a fresh app/db per test.
  await prisma.watchlistItem.deleteMany();
  await prisma.watchlist.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/watchlist", () => {
  it("returns an empty list when nothing's been added yet", async () => {
    const res = await agent.get("/api/watchlist");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [] });
  });

  it("returns 401 without a session", async () => {
    const res = await request(app).get("/api/watchlist");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/watchlist", () => {
  it("adds a valid ticker and returns it", async () => {
    const res = await agent.post("/api/watchlist").send({ symbol: "aapl", name: "Apple Inc." });

    expect(res.status).toBe(201);
    expect(res.body.item).toMatchObject({ symbol: "AAPL", name: "Apple Inc." });

    const list = await agent.get("/api/watchlist");
    expect(list.body.items).toHaveLength(1);
  });

  it("rejects an invalid symbol with 400 before it ever reaches the database", async () => {
    const res = await agent.post("/api/watchlist").send({ symbol: "NOT_A_TICKER_123" });
    expect(res.status).toBe(400);

    const list = await agent.get("/api/watchlist");
    expect(list.body.items).toHaveLength(0);
  });

  it("rejects a missing symbol", async () => {
    const res = await agent.post("/api/watchlist").send({ name: "no symbol here" });
    expect(res.status).toBe(400);
  });

  it("returns 409 for a symbol that's already on the list", async () => {
    await agent.post("/api/watchlist").send({ symbol: "MSFT" });
    const res = await agent.post("/api/watchlist").send({ symbol: "msft" }); // same symbol, different case

    expect(res.status).toBe(409);

    const list = await agent.get("/api/watchlist");
    expect(list.body.items).toHaveLength(1); // the duplicate never got inserted
  });

  it("keeps each user's watchlist separate", async () => {
    await agent.post("/api/watchlist").send({ symbol: "MSFT" });

    const otherAgent = request.agent(app);
    await otherAgent.post("/api/auth/signup").send({ email: "other-user@example.com", password: "test-password" });
    // signup no longer returns a session - log in to get one
    await otherAgent.post("/api/auth/login").send({ email: "other-user@example.com", password: "test-password" });
    const res = await otherAgent.post("/api/watchlist").send({ symbol: "MSFT" });

    // Same symbol, different user - not a 409, since it's a different watchlist.
    expect(res.status).toBe(201);
  });

  it("accepts shares and costBasis, adding real holdings up front", async () => {
    const res = await agent.post("/api/watchlist").send({ symbol: "AAPL", shares: 10, costBasis: 150.25 });

    expect(res.status).toBe(201);
    expect(res.body.item).toMatchObject({ shares: 10, costBasis: 150.25 });
  });

  it("defaults shares/costBasis to null when not provided - watching, not owning", async () => {
    const res = await agent.post("/api/watchlist").send({ symbol: "AAPL" });
    expect(res.body.item.shares).toBeNull();
    expect(res.body.item.costBasis).toBeNull();
  });

  it("rejects shares without a matching costBasis", async () => {
    const res = await agent.post("/api/watchlist").send({ symbol: "AAPL", shares: 10 });
    expect(res.status).toBe(400);
  });

  it("caps a watchlist at MAX_SYMBOLS_PER_CLIENT items", async () => {
    // 30 distinct, schema-valid two-letter symbols: AA..AZ, then BA..BD (30 total).
    const symbols = Array.from({ length: 30 }, (_, i) => String.fromCharCode(65 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26)));

    for (const symbol of symbols) {
      const res = await agent.post("/api/watchlist").send({ symbol });
      expect(res.status).toBe(201);
    }

    const res = await agent.post("/api/watchlist").send({ symbol: "ZZ" });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/watchlist is full/i);

    const list = await agent.get("/api/watchlist");
    expect(list.body.items).toHaveLength(30); // the 31st never got inserted
  });
});

describe("DELETE /api/watchlist/:symbol", () => {
  it("removes an existing symbol and returns 204", async () => {
    await agent.post("/api/watchlist").send({ symbol: "TSLA" });

    const res = await agent.delete("/api/watchlist/TSLA");
    expect(res.status).toBe(204);

    const list = await agent.get("/api/watchlist");
    expect(list.body.items).toHaveLength(0);
  });

  it("is case-insensitive", async () => {
    await agent.post("/api/watchlist").send({ symbol: "NVDA" });
    const res = await agent.delete("/api/watchlist/nvda");
    expect(res.status).toBe(204);
  });

  it("returns 404 for a symbol that isn't on the list", async () => {
    const res = await agent.delete("/api/watchlist/GOOGL");
    expect(res.status).toBe(404);
  });

  it("returns 400 for a malformed symbol in the URL", async () => {
    const res = await agent.delete("/api/watchlist/not-a-real-ticker-shape-at-all");
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/watchlist/:symbol", () => {
  it("sets holdings on an item that was just watching", async () => {
    await agent.post("/api/watchlist").send({ symbol: "AAPL" });

    const res = await agent.patch("/api/watchlist/AAPL").send({ shares: 5, costBasis: 200 });

    expect(res.status).toBe(200);
    expect(res.body.item).toMatchObject({ shares: 5, costBasis: 200 });
  });

  it("updates existing holdings to new values", async () => {
    await agent.post("/api/watchlist").send({ symbol: "AAPL", shares: 5, costBasis: 200 });

    const res = await agent.patch("/api/watchlist/AAPL").send({ shares: 8, costBasis: 210 });

    expect(res.body.item).toMatchObject({ shares: 8, costBasis: 210 });
  });

  it("clears holdings when both are sent as null", async () => {
    await agent.post("/api/watchlist").send({ symbol: "AAPL", shares: 5, costBasis: 200 });

    const res = await agent.patch("/api/watchlist/AAPL").send({ shares: null, costBasis: null });

    expect(res.status).toBe(200);
    expect(res.body.item.shares).toBeNull();
    expect(res.body.item.costBasis).toBeNull();
  });

  it("rejects a mix of null and a real value", async () => {
    await agent.post("/api/watchlist").send({ symbol: "AAPL" });

    const res = await agent.patch("/api/watchlist/AAPL").send({ shares: 5, costBasis: null });
    expect(res.status).toBe(400);
  });

  it("returns 404 for a symbol that isn't on the list", async () => {
    const res = await agent.patch("/api/watchlist/GOOGL").send({ shares: 1, costBasis: 100 });
    expect(res.status).toBe(404);
  });

  it("can't update another user's holdings", async () => {
    await agent.post("/api/watchlist").send({ symbol: "AAPL" });

    const otherAgent = request.agent(app);
    await otherAgent.post("/api/auth/signup").send({ email: "patch-other-user@example.com", password: "test-password" });
    // signup no longer returns a session - log in to get one
    await otherAgent.post("/api/auth/login").send({ email: "patch-other-user@example.com", password: "test-password" });
    const res = await otherAgent.patch("/api/watchlist/AAPL").send({ shares: 5, costBasis: 200 });

    expect(res.status).toBe(404);
  });
});
