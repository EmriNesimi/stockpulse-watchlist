import { afterAll, afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../db";

const app = createApp();

afterEach(async () => {
  await prisma.priceAlert.deleteMany();
  await prisma.watchlistItem.deleteMany();
  await prisma.watchlist.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/alerts", () => {
  it("returns an empty list when no alerts exist yet", async () => {
    const res = await request(app).get("/api/alerts");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ alerts: [] });
  });
});

describe("POST /api/alerts", () => {
  it("creates an alert with a valid symbol/threshold/direction", async () => {
    const res = await request(app)
      .post("/api/alerts")
      .send({ symbol: "aapl", threshold: 200, direction: "above" });

    expect(res.status).toBe(201);
    expect(res.body.alert).toMatchObject({
      symbol: "AAPL",
      threshold: 200,
      direction: "above",
      triggeredAt: null,
    });

    const list = await request(app).get("/api/alerts");
    expect(list.body.alerts).toHaveLength(1);
  });

  it("rejects an invalid direction", async () => {
    const res = await request(app)
      .post("/api/alerts")
      .send({ symbol: "AAPL", threshold: 200, direction: "sideways" });
    expect(res.status).toBe(400);
  });

  it("rejects a negative threshold", async () => {
    const res = await request(app)
      .post("/api/alerts")
      .send({ symbol: "AAPL", threshold: -5, direction: "above" });
    expect(res.status).toBe(400);
  });

  it("rejects a zero threshold", async () => {
    const res = await request(app)
      .post("/api/alerts")
      .send({ symbol: "AAPL", threshold: 0, direction: "below" });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid ticker symbol", async () => {
    const res = await request(app)
      .post("/api/alerts")
      .send({ symbol: "NOT_A_TICKER_123", threshold: 200, direction: "above" });
    expect(res.status).toBe(400);
  });

  it("allows more than one alert on the same symbol (e.g. one above, one below)", async () => {
    await request(app).post("/api/alerts").send({ symbol: "AAPL", threshold: 250, direction: "above" });
    await request(app).post("/api/alerts").send({ symbol: "AAPL", threshold: 150, direction: "below" });

    const list = await request(app).get("/api/alerts");
    expect(list.body.alerts).toHaveLength(2);
  });
});

describe("DELETE /api/alerts/:id", () => {
  it("removes an existing alert and returns 204", async () => {
    const created = await request(app)
      .post("/api/alerts")
      .send({ symbol: "TSLA", threshold: 300, direction: "above" });

    const res = await request(app).delete(`/api/alerts/${created.body.alert.id}`);
    expect(res.status).toBe(204);

    const list = await request(app).get("/api/alerts");
    expect(list.body.alerts).toHaveLength(0);
  });

  it("returns 404 for an id that doesn't exist", async () => {
    const res = await request(app).delete("/api/alerts/not-a-real-id");
    expect(res.status).toBe(404);
  });
});
