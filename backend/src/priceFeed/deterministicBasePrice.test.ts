import { describe, expect, it } from "vitest";
import { deterministicBasePrice } from "./deterministicBasePrice";
import { generateSimulatedHistory } from "./simulatedHistory";

// The whole point of this function is that two independent consumers agree.
// SimulatedFeed seeds live ticks from it and simulatedHistory seeds candles
// from it, so if it ever stopped being deterministic a symbol's price and its
// chart would drift apart with nothing failing.
describe("deterministicBasePrice", () => {
  it("gives the same symbol the same price every time", () => {
    expect(deterministicBasePrice("AAPL")).toBe(deterministicBasePrice("AAPL"));
  });

  it("gives different symbols different prices", () => {
    const prices = ["AAPL", "MSFT", "GOOGL", "TSLA", "NVDA"].map(deterministicBasePrice);
    expect(new Set(prices).size).toBe(prices.length);
  });

  it("stays inside the plausible $20-$500 range the comment claims", () => {
    // Exhaustive over every two-letter symbol, rather than a handful of real
    // ones - the hash is what decides, and it has no idea which tickers exist.
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const price = deterministicBasePrice(String.fromCharCode(a) + String.fromCharCode(b));
        expect(price).toBeGreaterThanOrEqual(20);
        expect(price).toBeLessThanOrEqual(500);
      }
    }
  });

  it("is order-sensitive, so transposed symbols don't collide", () => {
    expect(deterministicBasePrice("AB")).not.toBe(deterministicBasePrice("BA"));
  });

  it("doesn't overflow into a negative or fractional price on a long symbol", () => {
    const price = deterministicBasePrice("ABCDEF");
    expect(Number.isInteger(price)).toBe(true);
    expect(price).toBeGreaterThanOrEqual(20);
  });
});

// The agreement itself, not just the function in isolation: a symbol's first
// simulated candle should sit in the same neighbourhood as its base price.
describe("deterministicBasePrice shared with the candle generator", () => {
  it("anchors simulated history near the same symbol's base price", () => {
    const base = deterministicBasePrice("AAPL");
    const candles = generateSimulatedHistory("AAPL", 30);

    expect(candles.length).toBeGreaterThan(0);
    const closes = candles.map((c) => c.close);
    const nearest = Math.min(...closes.map((c) => Math.abs(c - base)));
    // A random walk drifts, so this is a sanity bound rather than equality:
    // some candle has to be recognisably related to the base price.
    expect(nearest).toBeLessThan(base);
  });
});
