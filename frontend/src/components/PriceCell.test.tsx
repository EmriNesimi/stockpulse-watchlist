import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import PriceCell from "./PriceCell";
import type { PriceState } from "../types";

function state(overrides: Partial<PriceState> = {}): PriceState {
  return { price: 100, changePercent: 0, source: "simulated", history: [], ...overrides };
}

describe("PriceCell", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a placeholder dash when there's no price data yet", () => {
    render(<PriceCell />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("doesn't show a LIVE/SIM badge when there's no price data", () => {
    render(<PriceCell />);
    expect(screen.queryByText("LIVE")).not.toBeInTheDocument();
    expect(screen.queryByText("SIM")).not.toBeInTheDocument();
  });

  it("formats the price to two decimal places", () => {
    render(<PriceCell state={state({ price: 231.5 })} />);
    expect(screen.getByText("$231.50")).toBeInTheDocument();
  });

  it("shows a LIVE badge for real trade data", () => {
    render(<PriceCell state={state({ source: "live" })} />);
    expect(screen.getByText("LIVE")).toBeInTheDocument();
  });

  it("shows a SIM badge for simulated data", () => {
    render(<PriceCell state={state({ source: "simulated" })} />);
    expect(screen.getByText("SIM")).toBeInTheDocument();
  });

  it("doesn't flash on the very first render (nothing to compare against)", () => {
    const { container } = render(<PriceCell state={state({ price: 100 })} />);
    const cell = container.firstElementChild as HTMLElement;
    expect(cell.style.backgroundColor).toBe("transparent");
  });

  it("flashes bullish when the price goes up, then fades back", () => {
    const { container, rerender } = render(<PriceCell state={state({ price: 100 })} />);
    rerender(<PriceCell state={state({ price: 105 })} />);

    const cell = container.firstElementChild as HTMLElement;
    expect(cell.style.backgroundColor).toContain("var(--color-bullish)");

    act(() => vi.advanceTimersByTime(500));
    expect(cell.style.backgroundColor).toBe("transparent");
  });

  it("flashes bearish when the price goes down", () => {
    const { container, rerender } = render(<PriceCell state={state({ price: 100 })} />);
    rerender(<PriceCell state={state({ price: 95 })} />);

    const cell = container.firstElementChild as HTMLElement;
    expect(cell.style.backgroundColor).toContain("var(--color-bearish)");
  });

  it("doesn't flash again if the price stays the same", () => {
    const { container, rerender } = render(<PriceCell state={state({ price: 100 })} />);
    rerender(<PriceCell state={state({ price: 100 })} />);

    const cell = container.firstElementChild as HTMLElement;
    expect(cell.style.backgroundColor).toBe("transparent");
  });
});
