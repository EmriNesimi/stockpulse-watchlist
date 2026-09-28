import { describe, expect, it } from "vitest";
import { tickerAvatarHue } from "./tickerColor";

describe("tickerAvatarHue", () => {
  it("is deterministic - the same symbol always gets the same color", () => {
    expect(tickerAvatarHue("AAPL")).toBe(tickerAvatarHue("AAPL"));
  });

  // The hash is >>> 0 before the modulo, so a symbol that overflows 32 bits
  // still lands in range rather than going negative and producing
  // var(--avatar-hue-0) or a negative index, neither of which exists.
  it("stays in range for long symbols that overflow the hash", () => {
    for (const symbol of ["AAAAAA", "ZZZZZZ", "BRK.B", "BF-B"]) {
      expect(tickerAvatarHue(symbol)).toMatch(/^var\(--avatar-hue-[1-6]\)$/);
    }
  });

  it("returns one of the six avatar hue CSS variables", () => {
    const value = tickerAvatarHue("MSFT");
    expect(value).toMatch(/^var\(--avatar-hue-[1-6]\)$/);
  });

  it("gives different symbols a decent spread across the hue set", () => {
    const symbols = ["AAPL", "MSFT", "TSLA", "GOOGL", "AMZN", "NVDA", "META", "BRK.B"];
    const hues = new Set(symbols.map(tickerAvatarHue));
    expect(hues.size).toBeGreaterThan(1);
  });
});
