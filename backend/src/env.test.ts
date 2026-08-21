import { afterEach, describe, expect, it, vi } from "vitest";

// env.ts does `import "dotenv/config"`, which re-reads backend/.env every time
// vi.resetModules() forces a re-import — refilling the exact vars these tests
// delete. The suite only passed because CI has no .env file. Stub it so these
// tests exercise process.env and nothing else.
vi.mock("dotenv/config", () => ({}));

const ENV_KEYS = ["NODE_ENV", "DATABASE_URL", "FRONTEND_ORIGIN", "SESSION_SECRET"] as const;

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
    snapshotAndSet({
      NODE_ENV: "production",
      DATABASE_URL: undefined,
      FRONTEND_ORIGIN: "https://example.com",
      SESSION_SECRET: "prod-secret",
    });
    vi.resetModules();

    await expect(import("./env")).rejects.toThrow("Missing required env var: DATABASE_URL");
  });

  it("throws at import time if FRONTEND_ORIGIN is missing in production", async () => {
    snapshotAndSet({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://prod",
      FRONTEND_ORIGIN: undefined,
      SESSION_SECRET: "prod-secret",
    });
    vi.resetModules();

    await expect(import("./env")).rejects.toThrow("Missing required env var: FRONTEND_ORIGIN");
  });

  it("throws at import time if SESSION_SECRET is missing in production", async () => {
    snapshotAndSet({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://prod",
      FRONTEND_ORIGIN: "https://example.com",
      SESSION_SECRET: undefined,
    });
    vi.resetModules();

    await expect(import("./env")).rejects.toThrow("Missing required env var: SESSION_SECRET");
  });

  it("does not throw in production when all three vars are set", async () => {
    snapshotAndSet({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://prod",
      FRONTEND_ORIGIN: "https://example.com",
      SESSION_SECRET: "prod-secret",
    });
    vi.resetModules();

    const { env } = await import("./env");
    expect(env.databaseUrl).toBe("postgres://prod");
    expect(env.frontendOrigin).toBe("https://example.com");
    expect(env.sessionSecret).toBe("prod-secret");
  });

  it("falls back to the dev defaults when unset and NODE_ENV isn't production", async () => {
    snapshotAndSet({
      NODE_ENV: "development",
      DATABASE_URL: undefined,
      FRONTEND_ORIGIN: undefined,
      SESSION_SECRET: undefined,
    });
    vi.resetModules();

    const { env } = await import("./env");
    expect(env.databaseUrl).toBe("postgresql://postgres:postgres@localhost:5432/stockpulse_dev");
    expect(env.frontendOrigin).toBe("http://localhost:5173");
    expect(env.sessionSecret).toBe("dev-only-session-secret-do-not-use-in-production");
  });
});
