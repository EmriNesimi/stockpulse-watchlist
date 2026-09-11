import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CandlestickChart from "./CandlestickChart";
import type { Candle } from "../lib/api";

const candles: Candle[] = [
  { time: "2026-09-01", open: 100, high: 105, low: 98, close: 103, volume: 1000 },
  { time: "2026-09-02", open: 103, high: 108, low: 101, close: 99, volume: 1200 },
  { time: "2026-09-03", open: 99, high: 100, low: 95, close: 96, volume: 900 },
];

describe("CandlestickChart", () => {
  it("shows a loading indicator while loading", () => {
    render(<CandlestickChart candles={[]} loading={true} error={null} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading chart");
  });

  it("shows an error message when the fetch failed", () => {
    render(<CandlestickChart candles={[]} loading={false} error="Rate limited" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Rate limited");
  });

  it("shows an empty state when there are no candles and no error", () => {
    render(<CandlestickChart candles={[]} loading={false} error={null} />);
    expect(screen.getByText(/no price history/i)).toBeInTheDocument();
  });

  it("renders one candle group per data point", () => {
    const { container } = render(<CandlestickChart candles={candles} loading={false} error={null} />);
    expect(container.querySelectorAll("rect")).toHaveLength(candles.length);
    expect(container.querySelectorAll("line")).toHaveLength(candles.length);
  });

  it("renders an accessible label summarizing the price range", () => {
    render(<CandlestickChart candles={candles} loading={false} error={null} />);
    expect(screen.getByRole("img", { name: /\$95\.00 to \$108\.00/ })).toBeInTheDocument();
  });

  it("doesn't crash when every candle has the same price (zero range)", () => {
    const flat: Candle[] = [
      { time: "2026-09-01", open: 100, high: 100, low: 100, close: 100, volume: 500 },
      { time: "2026-09-02", open: 100, high: 100, low: 100, close: 100, volume: 500 },
    ];
    render(<CandlestickChart candles={flat} loading={false} error={null} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });
});

describe("CandlestickChart geometry", () => {
  const candle = (over: Partial<Candle> = {}): Candle => ({
    time: "2026-09-01", open: 100, high: 110, low: 95, close: 105, volume: 1000, ...over,
  });

  const bodies = (container: HTMLElement) =>
    Array.from(container.querySelectorAll("rect"));

  // 640 / 1 * 0.6 = 384, so one candle rendered as a slab across most of the
  // chart. Correct arithmetic, absurd on screen — found by looking at it.
  it("keeps a lone candle a sane width instead of filling the chart", () => {
    const { container } = render(
      <CandlestickChart candles={[candle()]} loading={false} error={null} />
    );

    const width = Number(bodies(container)[0]?.getAttribute("width"));
    expect(width).toBeGreaterThan(0);
    expect(width).toBeLessThanOrEqual(32);
  });

  it("still narrows the body when there are many candles", () => {
    const many = Array.from({ length: 64 }, (_, i) =>
      candle({ time: `2026-09-${String((i % 28) + 1).padStart(2, "0")}` })
    );
    const { container } = render(
      <CandlestickChart candles={many} loading={false} error={null} />
    );

    // 640/64 * 0.6 = 6 — the cap must not become a floor.
    expect(Number(bodies(container)[0]?.getAttribute("width"))).toBeCloseTo(6, 1);
  });

  // range = high - low || 1 makes the divisor synthetic when nothing moved,
  // and (value - low) is then 0 for every point, so y lands on the bottom of
  // the plot area. Three flat closes sat on the border like clipped content.
  it("centres a flat series instead of pinning it to the bottom edge", () => {
    const flat = ["2026-09-01", "2026-09-02", "2026-09-03"].map((time) =>
      candle({ time, open: 100, high: 100, low: 100, close: 100 })
    );
    const { container } = render(
      <CandlestickChart candles={flat} loading={false} error={null} />
    );

    const wick = container.querySelector("line")!;
    const y1 = Number(wick.getAttribute("y1"));
    // HEIGHT 200, PADDING_Y 12 -> usable 176, so the middle is 100.
    expect(y1).toBeCloseTo(100, 0);
  });

  it("still scales a series that does move", () => {
    const moving = [
      candle({ time: "2026-09-01", low: 100, high: 100, open: 100, close: 100 }),
      candle({ time: "2026-09-02", low: 200, high: 200, open: 200, close: 200 }),
    ];
    const { container } = render(
      <CandlestickChart candles={moving} loading={false} error={null} />
    );

    const lines = Array.from(container.querySelectorAll("line"));
    const first = lines[0]!;
    const second = lines[1]!;
    // Low at the bottom of the usable area, high at the top.
    expect(Number(first.getAttribute("y1"))).toBeCloseTo(188, 0);
    expect(Number(second.getAttribute("y1"))).toBeCloseTo(12, 0);
  });
});
