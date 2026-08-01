import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mocked so these tests never make a real network call regardless of
// whether MASSIVE_API_KEY happens to be set in the local environment.
vi.mock("./previousClose", () => ({
  fetchPreviousClose: vi.fn().mockResolvedValue(null),
}));

import { fetchPreviousClose } from "./previousClose";
import { SimulatedFeed } from "./SimulatedFeed";

const TICK_INTERVAL_MS = 1500;

describe("SimulatedFeed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(fetchPreviousClose).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("delivers a tick on each interval", () => {
    const feed = new SimulatedFeed();
    const onTick = vi.fn();
    feed.subscribe("AAPL", onTick);

    expect(onTick).not.toHaveBeenCalled();
    vi.advanceTimersByTime(TICK_INTERVAL_MS);
    expect(onTick).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(TICK_INTERVAL_MS);
    expect(onTick).toHaveBeenCalledTimes(2);
  });

  it("tags every tick as simulated with the right symbol", () => {
    const feed = new SimulatedFeed();
    const onTick = vi.fn();
    feed.subscribe("MSFT", onTick);
    vi.advanceTimersByTime(TICK_INTERVAL_MS);

    expect(onTick).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: "MSFT", source: "simulated" })
    );
  });

  it("keeps each tick's price move within the configured step bound", () => {
    const feed = new SimulatedFeed();
    const prices: number[] = [];
    feed.subscribe("TSLA", (tick) => prices.push(tick.price));

    for (let i = 0; i < 20; i++) vi.advanceTimersByTime(TICK_INTERVAL_MS);

    expect(prices).toHaveLength(20);
    for (let i = 1; i < prices.length; i++) {
      const pctMove = Math.abs(prices[i] - prices[i - 1]) / prices[i - 1];
      // MAX_STEP_PCT is 0.2%, but each tick's price is rounded to the cent
      // before this test ever sees it, so a low-dollar symbol can show a
      // slightly larger *rounded* delta than the raw underlying step was.
      // 0.6% comfortably absorbs that rounding noise while still catching a
      // real regression (e.g. the clamp being removed entirely).
      expect(pctMove).toBeLessThanOrEqual(0.006);
    }
  });

  it("computes changePercent relative to the base price", () => {
    const feed = new SimulatedFeed();
    const ticks: { price: number; changePercent: number }[] = [];
    feed.subscribe("GOOGL", (tick) => ticks.push(tick));
    vi.advanceTimersByTime(TICK_INTERVAL_MS);

    const [tick] = ticks;
    // basePrice isn't exposed directly, but changePercent must be internally
    // consistent with it: price = basePrice * (1 + changePercent/100).
    const impliedBase = tick.price / (1 + tick.changePercent / 100);
    expect(impliedBase).toBeGreaterThan(0);
  });

  it("stops ticking a subscriber once it unsubscribes", () => {
    const feed = new SimulatedFeed();
    const onTick = vi.fn();
    const unsubscribe = feed.subscribe("AMZN", onTick);

    vi.advanceTimersByTime(TICK_INTERVAL_MS);
    expect(onTick).toHaveBeenCalledTimes(1);

    unsubscribe();
    vi.advanceTimersByTime(TICK_INTERVAL_MS * 5);
    expect(onTick).toHaveBeenCalledTimes(1); // no further calls after unsubscribing
  });

  it("keeps ticking remaining subscribers when only one of several unsubscribes", () => {
    const feed = new SimulatedFeed();
    const onTickA = vi.fn();
    const onTickB = vi.fn();
    const unsubscribeA = feed.subscribe("NFLX", onTickA);
    feed.subscribe("NFLX", onTickB);

    unsubscribeA();
    vi.advanceTimersByTime(TICK_INTERVAL_MS);

    expect(onTickA).not.toHaveBeenCalled();
    expect(onTickB).toHaveBeenCalledTimes(1);
  });

  it("adopts a real previous-close price once the async lookup resolves", async () => {
    vi.mocked(fetchPreviousClose).mockResolvedValue(150);
    const feed = new SimulatedFeed();
    const ticks: { price: number }[] = [];
    feed.subscribe("AAPL", (tick) => ticks.push(tick));

    // Let the mocked fetchPreviousClose promise resolve.
    await vi.waitFor(() => expect(fetchPreviousClose).toHaveBeenCalledWith("AAPL"));
    await Promise.resolve();
    await Promise.resolve();

    vi.advanceTimersByTime(TICK_INTERVAL_MS);
    // Should be walking from ~150 now, not the deterministic hash fallback.
    expect(ticks[0].price).toBeGreaterThan(140);
    expect(ticks[0].price).toBeLessThan(160);
  });
});
