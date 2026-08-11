import { afterEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = ["NODE_ENV", "DATABASE_URL", "FRONTEND_ORIGIN"] as const;

describe("env", () => {
  const original: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
    vi.resetModules();
  });

  function snapshotAndSet(overrides: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>) {
    for (const key of ENV_KEYS) {
      original[key] = process.env[key];
      const value = overrides[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }

  it("throws at import time if DATABASE_URL is missing in production", async () => {
    snapshotAndSet({ NODE_ENV: "production", DATABASE_URL: undefined, FRONTEND_ORIGIN: "https://example.com" });
    vi.resetModules();

    await expect(import("./env")).rejects.toThrow("Missing required env var: DATABASE_URL");
  });

  it("throws at import time if FRONTEND_ORIGIN is missing in production", async () => {
    snapshotAndSet({ NODE_ENV: "production", DATABASE_URL: "postgres://prod", FRONTEND_ORIGIN: undefined });
    vi.resetModules();

    await expect(import("./env")).rejects.toThrow("Missing required env var: FRONTEND_ORIGIN");
  });

  it("does not throw in production when both vars are set", async () => {
    snapshotAndSet({ NODE_ENV: "production", DATABASE_URL: "postgres://prod", FRONTEND_ORIGIN: "https://example.com" });
    vi.resetModules();

    const { env } = await import("./env");
    expect(env.databaseUrl).toBe("postgres://prod");
    expect(env.frontendOrigin).toBe("https://example.com");
  });

  it("falls back to the dev defaults when DATABASE_URL/FRONTEND_ORIGIN are unset and NODE_ENV isn't production", async () => {
    snapshotAndSet({ NODE_ENV: "development", DATABASE_URL: undefined, FRONTEND_ORIGIN: undefined });
    vi.resetModules();

    const { env } = await import("./env");
    expect(env.databaseUrl).toBe("file:./prisma/dev.db");
    expect(env.frontendOrigin).toBe("http://localhost:5173");
  });
});
