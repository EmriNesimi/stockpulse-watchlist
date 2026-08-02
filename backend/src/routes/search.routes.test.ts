import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

// Controlled per test instead of relying on whatever happens to be in the
// local .env — otherwise these tests would behave differently on a machine
// with a real MASSIVE_API_KEY set versus CI, which has none. Mocking "../env"
// replaces it for every importer in this file's module graph (app.ts too),
// so the other fields need real-ish defaults or CORS/etc. would break.
const mockEnv = vi.hoisted(() => ({
  port: 4000,
  massiveApiKey: undefined as string | undefined,
  databaseUrl: "file:./prisma/test.db",
  frontendOrigin: "http://localhost:5173",
}));
vi.mock("../env", () => ({ env: mockEnv }));

// The rate limiter's own sliding-window behavior is already covered in
// rateLimiter.test.ts — here we only care that the route respects whatever
// it says, so it's mocked to a controllable boolean.
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

describe("GET /api/search — no API key configured", () => {
  it("serves the static fallback list and never calls fetch", async () => {
    const res = await request(app).get("/api/search?q=apple");

    expect(res.status).toBe(200);
    expect(res.body.source).toBe("fallback");
    expect(res.body.results.some((r: { symbol: string }) => r.symbol === "AAPL")).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a missing q param with 400", async () => {
    const res = await request(app).get("/api/search");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/search — API key configured", () => {
  beforeEach(() => {
    mockEnv.massiveApiKey = "test-key-123";
  });

  it("proxies to Massive and maps ticker -> symbol", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{ ticker: "AAPL", name: "Apple Inc." }] }),
    } as Response);

    const res = await request(app).get("/api/search?q=apple");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ results: [{ symbol: "AAPL", name: "Apple Inc." }], source: "massive" });
    expect(fetch).toHaveBeenCalledTimes(1);
    const calledUrl = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(calledUrl).toContain("apiKey=test-key-123");
    expect(calledUrl).toContain("search=apple");
  });

  it("checks rate-limit quota before ever calling fetch", async () => {
    mockTryConsumeMassiveQuota.mockReturnValue(false);

    const res = await request(app).get("/api/search?q=apple");

    expect(res.status).toBe(200);
    expect(res.body.source).toBe("fallback");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falls back to the static list if Massive returns a non-ok status", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500 } as Response);

    const res = await request(app).get("/api/search?q=apple");

    expect(res.status).toBe(200); // never surfaces the upstream failure as a 500 of our own
    expect(res.body.source).toBe("fallback");
  });

  it("falls back to the static list if the fetch itself throws (network error, timeout)", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network blip"));

    const res = await request(app).get("/api/search?q=apple");

    expect(res.status).toBe(200);
    expect(res.body.source).toBe("fallback");
  });
});
