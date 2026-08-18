import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../db";

const app = createApp();

// The alerts routes require a signed-in user (see requireAuth in app.ts),
// so every test signs up fresh and reuses the resulting session cookie via
// a supertest agent instead of hitting the routes directly.
let agent: ReturnType<typeof request.agent>;

beforeEach(async () => {
  agent = request.agent(app);
  await agent.post("/api/auth/signup").send({ email: "alerts-test@example.com", password: "test-password" });
  // signup no longer returns a session - log in to get one
  await agent.post("/api/auth/login").send({ email: "alerts-test@example.com", password: "test-password" });
});

afterEach(async () => {
  await prisma.priceAlert.deleteMany();
  await prisma.watchlistItem.deleteMany();
  await prisma.watchlist.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/alerts", () => {
  it("returns an empty list when no alerts exist yet", async () => {
    const res = await agent.get("/api/alerts");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ alerts: [] });
  });

  it("returns 401 without a session", async () => {
    const res = await request(app).get("/api/alerts");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/alerts", () => {
  it("creates an alert with a valid symbol/threshold/direction", async () => {
    const res = await agent.post("/api/alerts").send({ symbol: "aapl", threshold: 200, direction: "above" });

    expect(res.status).toBe(201);
    expect(res.body.alert).toMatchObject({
      symbol: "AAPL",
      threshold: 200,
      direction: "above",
      triggeredAt: null,
    });

    const list = await agent.get("/api/alerts");
    expect(list.body.alerts).toHaveLength(1);
  });

  it("rejects an invalid direction", async () => {
    const res = await agent.post("/api/alerts").send({ symbol: "AAPL", threshold: 200, direction: "sideways" });
    expect(res.status).toBe(400);
  });

  it("rejects a negative threshold", async () => {
    const res = await agent.post("/api/alerts").send({ symbol: "AAPL", threshold: -5, direction: "above" });
    expect(res.status).toBe(400);
  });

  it("rejects a zero threshold", async () => {
    const res = await agent.post("/api/alerts").send({ symbol: "AAPL", threshold: 0, direction: "below" });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid ticker symbol", async () => {
    const res = await agent.post("/api/alerts").send({ symbol: "NOT_A_TICKER_123", threshold: 200, direction: "above" });
    expect(res.status).toBe(400);
  });

  it("allows more than one alert on the same symbol (e.g. one above, one below)", async () => {
    await agent.post("/api/alerts").send({ symbol: "AAPL", threshold: 250, direction: "above" });
    await agent.post("/api/alerts").send({ symbol: "AAPL", threshold: 150, direction: "below" });

    const list = await agent.get("/api/alerts");
    expect(list.body.alerts).toHaveLength(2);
  });
});

describe("DELETE /api/alerts/:id", () => {
  it("removes an existing alert and returns 204", async () => {
    const created = await agent.post("/api/alerts").send({ symbol: "TSLA", threshold: 300, direction: "above" });

    const res = await agent.delete(`/api/alerts/${created.body.alert.id}`);
    expect(res.status).toBe(204);

    const list = await agent.get("/api/alerts");
    expect(list.body.alerts).toHaveLength(0);
  });

  it("returns 404 for a well-formed id that doesn't exist", async () => {
    const res = await agent.delete("/api/alerts/cnotarealidatall00000000");
    expect(res.status).toBe(404);
  });

  it("returns 400 for a malformed id (not the cuid alphanumeric shape)", async () => {
    const res = await agent.delete("/api/alerts/not-a-real-id");
    expect(res.status).toBe(400);
  });

  it("can't delete another user's alert", async () => {
    const created = await agent.post("/api/alerts").send({ symbol: "TSLA", threshold: 300, direction: "above" });

    const otherAgent = request.agent(app);
    await otherAgent.post("/api/auth/signup").send({ email: "other-alerts-user@example.com", password: "test-password" });
    // signup no longer returns a session - log in to get one
    await otherAgent.post("/api/auth/login").send({ email: "other-alerts-user@example.com", password: "test-password" });
    const res = await otherAgent.delete(`/api/alerts/${created.body.alert.id}`);

    expect(res.status).toBe(404);
  });
});
