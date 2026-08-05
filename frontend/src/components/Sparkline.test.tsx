import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Sparkline from "./Sparkline";

describe("Sparkline", () => {
  it("renders a placeholder dashed line when there's fewer than 2 points", () => {
    render(<Sparkline values={[]} bullish={true} />);
    expect(screen.getByRole("img", { name: "Not enough price history yet" })).toBeInTheDocument();
  });

  it("renders a placeholder for a single data point too", () => {
    render(<Sparkline values={[100]} bullish={true} />);
    expect(screen.getByRole("img", { name: "Not enough price history yet" })).toBeInTheDocument();
  });

  it("renders an accessible label describing an upward trend", () => {
    render(<Sparkline values={[100, 105, 110]} bullish={true} />);
    expect(screen.getByRole("img", { name: /trending up/i })).toBeInTheDocument();
  });

  it("renders an accessible label describing a downward trend", () => {
    render(<Sparkline values={[110, 105, 100]} bullish={false} />);
    expect(screen.getByRole("img", { name: /trending down/i })).toBeInTheDocument();
  });

  it("draws one point per value in the polyline", () => {
    const { container } = render(<Sparkline values={[100, 105, 110, 108]} bullish={true} />);
    const polyline = container.querySelector("polyline");
    expect(polyline).not.toBeNull();
    const points = polyline!.getAttribute("points")!.trim().split(" ");
    expect(points).toHaveLength(4);
  });

  it("doesn't crash when every value is identical (zero range)", () => {
    render(<Sparkline values={[100, 100, 100]} bullish={true} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });
});
