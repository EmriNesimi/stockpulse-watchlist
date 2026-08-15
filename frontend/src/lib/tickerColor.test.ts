import { describe, expect, it } from "vitest";
import { tickerAvatarHue } from "./tickerColor";

describe("tickerAvatarHue", () => {
  it("is deterministic - the same symbol always gets the same color", () => {
    expect(tickerAvatarHue("AAPL")).toBe(tickerAvatarHue("AAPL"));
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
