import { afterAll, afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../db";

// Exercises the real route handlers end to end (Express + zod + Prisma)
// against a throwaway SQLite db (see vitest.config.ts / test/globalSetup.ts)
// — not mocks. This is what actually catches wiring bugs the unit tests on
// the schemas alone can't see.
const app = createApp();

afterEach(async () => {
  // Isolate tests from each other without needing a fresh app/db per test.
  await prisma.watchlistItem.deleteMany();
  await prisma.watchlist.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/watchlist", () => {
  it("returns an empty list when nothing's been added yet", async () => {
    const res = await request(app).get("/api/watchlist");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [] });
  });
});

describe("POST /api/watchlist", () => {
  it("adds a valid ticker and returns it", async () => {
    const res = await request(app)
      .post("/api/watchlist")
      .send({ symbol: "aapl", name: "Apple Inc." });

    expect(res.status).toBe(201);
    expect(res.body.item).toMatchObject({ symbol: "AAPL", name: "Apple Inc." });

    const list = await request(app).get("/api/watchlist");
    expect(list.body.items).toHaveLength(1);
  });

  it("rejects an invalid symbol with 400 before it ever reaches the database", async () => {
    const res = await request(app).post("/api/watchlist").send({ symbol: "NOT_A_TICKER_123" });
    expect(res.status).toBe(400);

    const list = await request(app).get("/api/watchlist");
    expect(list.body.items).toHaveLength(0);
  });

  it("rejects a missing symbol", async () => {
    const res = await request(app).post("/api/watchlist").send({ name: "no symbol here" });
    expect(res.status).toBe(400);
  });

  it("returns 409 for a symbol that's already on the list", async () => {
    await request(app).post("/api/watchlist").send({ symbol: "MSFT" });
    const res = await request(app).post("/api/watchlist").send({ symbol: "msft" }); // same symbol, different case

    expect(res.status).toBe(409);

    const list = await request(app).get("/api/watchlist");
    expect(list.body.items).toHaveLength(1); // the duplicate never got inserted
  });
});

describe("DELETE /api/watchlist/:symbol", () => {
  it("removes an existing symbol and returns 204", async () => {
    await request(app).post("/api/watchlist").send({ symbol: "TSLA" });

    const res = await request(app).delete("/api/watchlist/TSLA");
    expect(res.status).toBe(204);

    const list = await request(app).get("/api/watchlist");
    expect(list.body.items).toHaveLength(0);
  });

  it("is case-insensitive", async () => {
    await request(app).post("/api/watchlist").send({ symbol: "NVDA" });
    const res = await request(app).delete("/api/watchlist/nvda");
    expect(res.status).toBe(204);
  });

  it("returns 404 for a symbol that isn't on the list", async () => {
    const res = await request(app).delete("/api/watchlist/GOOGL");
    expect(res.status).toBe(404);
  });

  it("returns 400 for a malformed symbol in the URL", async () => {
    const res = await request(app).delete("/api/watchlist/not-a-real-ticker-shape-at-all");
    expect(res.status).toBe(400);
  });
});
