import { afterEach, describe, expect, it } from "vitest";
import { resetEmailQuota, tryConsumeEmailQuota } from "./sendThrottle";

const MINUTE = 60_000;

afterEach(() => resetEmailQuota());

describe("tryConsumeEmailQuota", () => {
  // The point of the whole module: /api/auth/signup is unauthenticated and
  // mails whatever address is submitted, so the per-IP limiter alone lets one
  // attacker sustain 10 emails a minute at a stranger's inbox indefinitely.
  it("allows one send per address then refuses until the cooldown lapses", () => {
    const t0 = 1_000_000;

    expect(tryConsumeEmailQuota("victim@example.com", t0)).toBe(true);
    expect(tryConsumeEmailQuota("victim@example.com", t0 + MINUTE)).toBe(false);
    expect(tryConsumeEmailQuota("victim@example.com", t0 + 14 * MINUTE)).toBe(false);
    expect(tryConsumeEmailQuota("victim@example.com", t0 + 16 * MINUTE)).toBe(true);
  });

  it("tracks addresses independently, so one target can't block another", () => {
    const t0 = 1_000_000;

    expect(tryConsumeEmailQuota("a@example.com", t0)).toBe(true);
    expect(tryConsumeEmailQuota("b@example.com", t0)).toBe(true);
    expect(tryConsumeEmailQuota("a@example.com", t0)).toBe(false);
  });

  // Addresses are attacker-supplied. Without pruning, the defence itself
  // becomes the memory-exhaustion vector.
  it("does not retain addresses past their cooldown", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 500; i++) tryConsumeEmailQuota(`flood${i}@example.com`, t0);

    // A later call sweeps the lapsed entries; the proof they're gone is that
    // the first address is treated as new again rather than still cooling.
    expect(tryConsumeEmailQuota("sentinel@example.com", t0 + 16 * MINUTE)).toBe(true);
    expect(tryConsumeEmailQuota("flood0@example.com", t0 + 16 * MINUTE)).toBe(true);
  });
});
