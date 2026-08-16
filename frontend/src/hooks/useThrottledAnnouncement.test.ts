import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useThrottledAnnouncement } from "./useThrottledAnnouncement";
import type { WatchlistItem } from "../lib/api";
import type { PriceState } from "../types";

function item(symbol: string): WatchlistItem {
  return { id: symbol, symbol, name: symbol, addedAt: new Date().toISOString(), shares: null, costBasis: null };
}

function price(overrides: Partial<PriceState> = {}): PriceState {
  return { price: 100, changePercent: 0, source: "simulated", history: [], ...overrides };
}

describe("useThrottledAnnouncement", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with no announcement", () => {
    const { result } = renderHook(() => useThrottledAnnouncement([], {}));
    expect(result.current).toBe("");
  });

  it("says nothing if there are watchlist items but no price data for them yet", () => {
    const { result } = renderHook(() => useThrottledAnnouncement([item("AAPL")], {}));
    expect(result.current).toBe("");
  });

  it("announces a summary once price data is available", () => {
    const { result, rerender } = renderHook(
      ({ prices }: { prices: Record<string, PriceState> }) =>
        useThrottledAnnouncement([item("AAPL")], prices),
      { initialProps: { prices: {} as Record<string, PriceState> } }
    );

    rerender({ prices: { AAPL: price({ price: 231.5, changePercent: 1.2 }) } });
    expect(result.current).toContain("AAPL");
    expect(result.current).toContain("231.50");
    expect(result.current).toContain("up");
    expect(result.current).toContain("1.20%");
  });

  it("describes a falling price as 'down'", () => {
    const { result, rerender } = renderHook(
      ({ prices }: { prices: Record<string, PriceState> }) =>
        useThrottledAnnouncement([item("AAPL")], prices),
      { initialProps: { prices: {} as Record<string, PriceState> } }
    );

    rerender({ prices: { AAPL: price({ price: 90, changePercent: -3.4 }) } });
    expect(result.current).toContain("down");
    expect(result.current).toContain("3.40%"); // magnitude, not the sign, in the number itself
  });

  it("summarizes every item on the watchlist that has price data, not just one", () => {
    const { result, rerender } = renderHook(
      ({ prices }: { prices: Record<string, PriceState> }) =>
        useThrottledAnnouncement([item("AAPL"), item("MSFT")], prices),
      { initialProps: { prices: {} as Record<string, PriceState> } }
    );

    rerender({
      prices: {
        AAPL: price({ price: 200 }),
        MSFT: price({ price: 400 }),
      },
    });
    expect(result.current).toContain("AAPL");
    expect(result.current).toContain("MSFT");
  });

  it("throttles: a second price change within 8s doesn't produce a new announcement", () => {
    const { result, rerender } = renderHook(
      ({ prices }: { prices: Record<string, PriceState> }) =>
        useThrottledAnnouncement([item("AAPL")], prices),
      { initialProps: { prices: {} as Record<string, PriceState> } }
    );

    rerender({ prices: { AAPL: price({ price: 100 }) } });
    const firstAnnouncement = result.current;
    expect(firstAnnouncement).toContain("100.00");

    vi.advanceTimersByTime(3000); // still well inside the 8s throttle window
    rerender({ prices: { AAPL: price({ price: 999 }) } });

    expect(result.current).toBe(firstAnnouncement); // unchanged — throttled
    expect(result.current).not.toContain("999");
  });

  it("announces again once the throttle window has passed", () => {
    const { result, rerender } = renderHook(
      ({ prices }: { prices: Record<string, PriceState> }) =>
        useThrottledAnnouncement([item("AAPL")], prices),
      { initialProps: { prices: {} as Record<string, PriceState> } }
    );

    rerender({ prices: { AAPL: price({ price: 100 }) } });
    expect(result.current).toContain("100.00");

    vi.advanceTimersByTime(8001); // just past the throttle window
    rerender({ prices: { AAPL: price({ price: 150 }) } });

    expect(result.current).toContain("150.00");
  });
});
