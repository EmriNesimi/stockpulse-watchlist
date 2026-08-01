import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { tryConsumeMassiveQuota as TryConsume } from "./rateLimiter";

// The limiter keeps its call log in module-level state, so each test gets a
// fresh module instance via resetModules + a dynamic re-import — otherwise
// quota consumed in one test would bleed into the next.
async function freshLimiter(): Promise<typeof TryConsume> {
  vi.resetModules();
  const mod = await import("./rateLimiter");
  return mod.tryConsumeMassiveQuota;
}

describe("tryConsumeMassiveQuota", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows calls up to the configured cap", async () => {
    const tryConsume = await freshLimiter();
    expect(tryConsume()).toBe(true);
    expect(tryConsume()).toBe(true);
    expect(tryConsume()).toBe(true);
    expect(tryConsume()).toBe(true);
  });

  it("rejects the call once the cap is reached within the window", async () => {
    const tryConsume = await freshLimiter();
    for (let i = 0; i < 4; i++) tryConsume();
    expect(tryConsume()).toBe(false);
  });

  it("frees up quota again once the window slides past the oldest call", async () => {
    const tryConsume = await freshLimiter();
    for (let i = 0; i < 4; i++) tryConsume();
    expect(tryConsume()).toBe(false);

    vi.advanceTimersByTime(60_001); // just past the 60s sliding window
    expect(tryConsume()).toBe(true);
  });

  it("only frees the slots that have actually aged out, not the whole quota at once", async () => {
    const tryConsume = await freshLimiter();
    tryConsume(); // t=0
    vi.advanceTimersByTime(30_000);
    tryConsume(); // t=30s
    tryConsume(); // t=30s
    tryConsume(); // t=30s -> quota now full (4 calls in the last 60s)
    expect(tryConsume()).toBe(false);

    vi.advanceTimersByTime(30_001); // t=60.001s: only the first call (t=0) has aged out
    expect(tryConsume()).toBe(true); // exactly one slot freed
    expect(tryConsume()).toBe(false); // and no more than that
  });
});
