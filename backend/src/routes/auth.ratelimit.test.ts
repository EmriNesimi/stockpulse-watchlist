import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { prisma } from "../db";

// authLimiter (see app.ts) is skipped when NODE_ENV === "test" so the other
// auth route tests - which share one app instance across a dozen-plus
// requests - don't trip it over something unrelated to what they're
// checking. This file is the exception: it overrides NODE_ENV to actually
// exercise the limiter, with its own app instance so it doesn't affect (or
// get affected by) any other test file's request count.
describe("POST /api/auth/login — rate limiting", () => {
  afterEach(async () => {
    vi.unstubAllEnvs();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 429 after exceeding the per-minute limit on auth routes", async () => {
    // Flipping to "production" also engages env.ts's fail-fast checks (see
    // env.test.ts), so the vars that already have real values need to be
    // restated explicitly here instead of relying on the dev fallbacks.
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", process.env.DATABASE_URL);
    vi.stubEnv("FRONTEND_ORIGIN", "http://localhost:5173");
    vi.stubEnv("SESSION_SECRET", "test-secret");
    vi.resetModules();
    const { createApp } = await import("../app.js");
    const app = createApp();

    const attempts = await Promise.all(
      Array.from({ length: 11 }, () =>
        request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: "wrong-password" })
      )
    );

    const statuses = attempts.map((res) => res.status);
    expect(statuses.filter((s) => s === 401)).toHaveLength(10); // within budget, just wrong credentials
    expect(statuses.filter((s) => s === 429)).toHaveLength(1); // the 11th trips the limiter
  });
});
