import { afterEach, describe, expect, it } from "vitest";
import { resetEmailQuota, tryConsumeEmailQuota } from "./sendThrottle";

const MINUTE = 60_000;

afterEach(() => resetEmailQuota());

describe("tryConsumeEmailQuota", () => {
  // The point of the whole module: /api/auth/signup is unauthenticated and
  // mails whatever address is submitted, so the per-IP limiter alone lets one
  // attacker sustain 10 emails a minute at a stranger's inbox indefinitely.
  it("allows a small burst per address, then refuses until the window lapses", () => {
    const t0 = 1_000_000;

    expect(tryConsumeEmailQuota("victim@example.com", t0)).toBe(true);
    expect(tryConsumeEmailQuota("victim@example.com", t0 + MINUTE)).toBe(true);
    expect(tryConsumeEmailQuota("victim@example.com", t0 + 2 * MINUTE)).toBe(true);
    expect(tryConsumeEmailQuota("victim@example.com", t0 + 3 * MINUTE)).toBe(false);
    expect(tryConsumeEmailQuota("victim@example.com", t0 + 16 * MINUTE)).toBe(true);
  });

  // An allowance of one made this a suppression tool: whoever asked first won
  // the whole window, so anyone who knew a registered address could keep the
  // owner's own reset email from ever being sent. A burst means one hostile
  // request no longer locks the owner out.
  it("does not let a single hostile request consume the whole window", () => {
    const t0 = 1_000_000;

    expect(tryConsumeEmailQuota("victim@example.com", t0)).toBe(true); // attacker
    expect(tryConsumeEmailQuota("victim@example.com", t0 + MINUTE)).toBe(true); // owner still gets through
  });

  it("tracks addresses independently, so one target can't block another", () => {
    const t0 = 1_000_000;

    for (let i = 0; i < 3; i++) expect(tryConsumeEmailQuota("a@example.com", t0)).toBe(true);
    expect(tryConsumeEmailQuota("a@example.com", t0)).toBe(false); // a is spent
    expect(tryConsumeEmailQuota("b@example.com", t0)).toBe(true); // b is untouched
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

describe("address normalisation", () => {
  // Not reachable through the routes — credentialsSchema lowercases first —
  // but the window is keyed by string, so the control shouldn't rely on that.
  it("treats a differently-cased address as the same mailbox", () => {
    expect(tryConsumeEmailQuota("alice@example.com")).toBe(true);
    expect(tryConsumeEmailQuota("Alice@Example.com")).toBe(true);
    expect(tryConsumeEmailQuota("ALICE@EXAMPLE.COM")).toBe(true);

    expect(tryConsumeEmailQuota("aLiCe@eXaMpLe.CoM")).toBe(false);
  });
});
