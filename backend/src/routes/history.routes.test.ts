import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

// Same mocking approach as search.routes.test.ts — env and the rate limiter
// are controlled explicitly so these tests behave the same locally (where a
// real MASSIVE_API_KEY might be in .env) as they do in CI (where none is).
const mockEnv = vi.hoisted(() => ({
  port: 4000,
  massiveApiKey: undefined as string | undefined,
  databaseUrl: "file:./prisma/test.db",
  frontendOrigin: "http://localhost:5173",
}));
vi.mock("../env", () => ({ env: mockEnv }));

const mockTryConsumeMassiveQuota = vi.hoisted(() => vi.fn());
vi.mock("../massive/rateLimiter", () => ({
  tryConsumeMassiveQuota: mockTryConsumeMassiveQuota,
}));

import { createApp } from "../app";

const app = createApp();

beforeEach(() => {
  mockEnv.massiveApiKey = undefined;
  mockTryConsumeMassiveQuota.mockReset().mockReturnValue(true);
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/history/:symbol — no API key configured", () => {
  it("serves simulated candles and never calls fetch", async () => {
    const res = await request(app).get("/api/history/AAPL?days=30");

    expect(res.status).toBe(200);
    expect(res.body.source).toBe("simulated");
    expect(res.body.candles).toHaveLength(30);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an invalid symbol with 400", async () => {
    const res = await request(app).get("/api/history/NOT_A_TICKER_123?days=30");
    expect(res.status).toBe(400);
  });

  it("rejects a days value outside 7-365", async () => {
    const res = await request(app).get("/api/history/AAPL?days=1000");
    expect(res.status).toBe(400);
  });

  it("defaults to 30 days when the days param is omitted", async () => {
    const res = await request(app).get("/api/history/AAPL");
    expect(res.status).toBe(200);
    expect(res.body.candles).toHaveLength(30);
  });
});

describe("GET /api/history/:symbol — API key configured", () => {
  beforeEach(() => {
    mockEnv.massiveApiKey = "test-key-123";
  });

  it("proxies to Massive's aggregates endpoint and maps bars to candles", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ t: Date.UTC(2026, 0, 1), o: 100, h: 105, l: 99, c: 103, v: 1_000_000 }],
      }),
    } as Response);

    const res = await request(app).get("/api/history/AAPL?days=30");

    expect(res.status).toBe(200);
    expect(res.body.source).toBe("massive");
    expect(res.body.candles).toEqual([
      { time: "2026-01-01", open: 100, high: 105, low: 99, close: 103, volume: 1_000_000 },
    ]);
    const calledUrl = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(calledUrl).toContain("apiKey=test-key-123");
    expect(calledUrl).toContain("/range/1/day/");
  });

  it("checks rate-limit quota before ever calling fetch", async () => {
    mockTryConsumeMassiveQuota.mockReturnValue(false);

    const res = await request(app).get("/api/history/AAPL?days=30");

    expect(res.status).toBe(200);
    expect(res.body.source).toBe("simulated");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falls back to simulated candles if Massive returns a non-ok status", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401 } as Response);

    const res = await request(app).get("/api/history/AAPL?days=30");

    expect(res.status).toBe(200);
    expect(res.body.source).toBe("simulated");
    expect(res.body.candles).toHaveLength(30);
  });

  it("falls back to simulated candles if the fetch itself throws", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network blip"));

    const res = await request(app).get("/api/history/AAPL?days=30");

    expect(res.status).toBe(200);
    expect(res.body.source).toBe("simulated");
  });

  it("falls back to simulated candles if Massive returns an empty result set", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) } as Response);

    const res = await request(app).get("/api/history/AAPL?days=30");

    expect(res.status).toBe(200);
    expect(res.body.source).toBe("simulated");
  });
});
