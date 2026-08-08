import { describe, expect, it } from "vitest";
import { generateSimulatedHistory } from "./simulatedHistory";

describe("generateSimulatedHistory", () => {
  it("returns exactly the requested number of candles", () => {
    expect(generateSimulatedHistory("AAPL", 30)).toHaveLength(30);
    expect(generateSimulatedHistory("AAPL", 7)).toHaveLength(7);
    expect(generateSimulatedHistory("AAPL", 365)).toHaveLength(365);
  });

  it("returns candles in ascending date order, ending today", () => {
    const candles = generateSimulatedHistory("AAPL", 10);
    const today = new Date().toISOString().slice(0, 10);
    expect(candles.at(-1)!.time).toBe(today);

    for (let i = 1; i < candles.length; i++) {
      expect(new Date(candles[i].time).getTime()).toBeGreaterThan(new Date(candles[i - 1].time).getTime());
    }
  });

  it("keeps high as the max and low as the min of open/high/low/close for every candle", () => {
    const candles = generateSimulatedHistory("AAPL", 30);
    for (const candle of candles) {
      expect(candle.high).toBeGreaterThanOrEqual(candle.open);
      expect(candle.high).toBeGreaterThanOrEqual(candle.close);
      expect(candle.low).toBeLessThanOrEqual(candle.open);
      expect(candle.low).toBeLessThanOrEqual(candle.close);
    }
  });

  it("chains each candle's open to the previous candle's close", () => {
    const candles = generateSimulatedHistory("AAPL", 10);
    for (let i = 1; i < candles.length; i++) {
      expect(candles[i].open).toBe(candles[i - 1].close);
    }
  });

  it("never produces a non-positive price", () => {
    const candles = generateSimulatedHistory("AAPL", 365);
    for (const candle of candles) {
      expect(candle.open).toBeGreaterThan(0);
      expect(candle.high).toBeGreaterThan(0);
      expect(candle.low).toBeGreaterThan(0);
      expect(candle.close).toBeGreaterThan(0);
    }
  });

  it("produces a positive volume for every candle", () => {
    const candles = generateSimulatedHistory("AAPL", 30);
    for (const candle of candles) {
      expect(candle.volume).toBeGreaterThan(0);
    }
  });

  it("is deterministic for the same symbol and day count", () => {
    expect(generateSimulatedHistory("AAPL", 30)).toEqual(generateSimulatedHistory("AAPL", 30));
  });

  it("gives different symbols different-looking series", () => {
    const aapl = generateSimulatedHistory("AAPL", 30);
    const msft = generateSimulatedHistory("MSFT", 30);
    expect(aapl[0].open).not.toBe(msft[0].open);
  });
});
