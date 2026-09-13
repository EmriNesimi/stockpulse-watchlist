import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Sparkline from "./Sparkline";

describe("Sparkline", () => {
  it("renders a placeholder dashed line when there's fewer than 2 points", () => {
    render(<Sparkline values={[]} direction="up" />);
    expect(screen.getByRole("img", { name: "Not enough price history yet" })).toBeInTheDocument();
  });

  it("renders a placeholder for a single data point too", () => {
    render(<Sparkline values={[100]} direction="up" />);
    expect(screen.getByRole("img", { name: "Not enough price history yet" })).toBeInTheDocument();
  });

  it("renders an accessible label describing an upward trend", () => {
    render(<Sparkline values={[100, 105, 110]} direction="up" />);
    expect(screen.getByRole("img", { name: /trending up/i })).toBeInTheDocument();
  });

  it("renders an accessible label describing a downward trend", () => {
    render(<Sparkline values={[110, 105, 100]} direction="down" />);
    expect(screen.getByRole("img", { name: /trending down/i })).toBeInTheDocument();
  });

  it("draws one point per value in the polyline", () => {
    const { container } = render(<Sparkline values={[100, 105, 110, 108]} direction="up" />);
    const polyline = container.querySelector("polyline");
    expect(polyline).not.toBeNull();
    const points = polyline!.getAttribute("points")!.trim().split(" ");
    expect(points).toHaveLength(4);
  });

  it("doesn't crash when every value is identical (zero range)", () => {
    render(<Sparkline values={[100, 100, 100]} direction="up" />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });
});

describe("Sparkline flat direction", () => {
  // A boolean forced every series into up or down, so a flat one announced
  // "trending up" beside a percentage that reads 0.00%.
  it("says the price is not moving rather than picking a direction", () => {
    render(<Sparkline values={[100, 100, 100]} direction="flat" />);

    expect(screen.getByRole("img", { name: /not moving/i })).toBeInTheDocument();
  });

  it("still names a real trend", () => {
    const { unmount } = render(<Sparkline values={[100, 110]} direction="up" />);
    expect(screen.getByRole("img", { name: /trending up/i })).toBeInTheDocument();
    unmount();

    render(<Sparkline values={[110, 100]} direction="down" />);
    expect(screen.getByRole("img", { name: /trending down/i })).toBeInTheDocument();
  });
});

describe("Sparkline flat colour", () => {
  // The label said three things and the colour said two, so a flat series was
  // drawn in the same green as a gain.
  it("draws a flat series in neither bullish nor bearish", () => {
    const { container } = render(<Sparkline values={[100, 100, 100]} direction="flat" />);
    const stroke = container.querySelector("polyline")?.getAttribute("stroke");

    expect(stroke).toBe("var(--color-foreground-muted)");
  });

  it("still draws real movement in the trend colours", () => {
    const { container, unmount } = render(<Sparkline values={[100, 110]} direction="up" />);
    expect(container.querySelector("polyline")?.getAttribute("stroke")).toBe("var(--color-bullish)");
    unmount();

    const down = render(<Sparkline values={[110, 100]} direction="down" />);
    expect(down.container.querySelector("polyline")?.getAttribute("stroke")).toBe("var(--color-bearish)");
  });
});
