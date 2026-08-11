import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CandlestickChart from "./CandlestickChart";
import type { Candle } from "../lib/api";

const candles: Candle[] = [
  { time: 1, open: 100, high: 105, low: 98, close: 103, volume: 1000 },
  { time: 2, open: 103, high: 108, low: 101, close: 99, volume: 1200 },
  { time: 3, open: 99, high: 100, low: 95, close: 96, volume: 900 },
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
      { time: 1, open: 100, high: 100, low: 100, close: 100, volume: 500 },
      { time: 2, open: 100, high: 100, low: 100, close: 100, volume: 500 },
    ];
    render(<CandlestickChart candles={flat} loading={false} error={null} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });
});
