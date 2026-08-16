import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SymbolChartPanel from "./SymbolChartPanel";
import { getHistory } from "../lib/api";
import type { WatchlistItem } from "../lib/api";
import type { PriceState } from "../types";

vi.mock("../lib/api", () => ({ getHistory: vi.fn() }));

function item(symbol = "AAPL"): WatchlistItem {
  return { id: symbol, symbol, name: "Apple Inc.", addedAt: "2026-01-01", shares: null, costBasis: null };
}

function price(value: number, changePercent = 0): PriceState {
  return { price: value, changePercent, source: "simulated", history: [] };
}

beforeEach(() => {
  vi.mocked(getHistory).mockResolvedValue({ candles: [], source: "simulated" });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("SymbolChartPanel", () => {
  it("prompts to add a ticker when there's nothing selected", () => {
    render(<SymbolChartPanel item={undefined} state={undefined} />);

    expect(screen.getByText(/Add a ticker/)).toBeInTheDocument();
    expect(getHistory).not.toHaveBeenCalled();
  });

  it("shows the symbol, name, price and change", () => {
    render(<SymbolChartPanel item={item()} state={price(123.45, 2.5)} />);

    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("Apple Inc.")).toBeInTheDocument();
    expect(screen.getByText("$123.45")).toBeInTheDocument();
    expect(screen.getByText("+2.50%")).toBeInTheDocument();
  });

  it("requests a month of history by default", async () => {
    render(<SymbolChartPanel item={item()} state={undefined} />);

    await waitFor(() => expect(getHistory).toHaveBeenCalledWith("AAPL", 30));
    expect(screen.getByRole("button", { name: "1M" })).toHaveAttribute("aria-pressed", "true");
  });

  it("refetches with the day count for the range that was picked", async () => {
    const user = userEvent.setup();
    render(<SymbolChartPanel item={item()} state={undefined} />);
    await waitFor(() => expect(getHistory).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "1Y" }));

    await waitFor(() => expect(getHistory).toHaveBeenCalledWith("AAPL", 365));
    expect(screen.getByRole("button", { name: "1Y" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "1M" })).toHaveAttribute("aria-pressed", "false");
  });

  it("only offers ranges the history endpoint accepts", () => {
    render(<SymbolChartPanel item={item()} state={undefined} />);

    const ranges = screen.getByRole("group", { name: "Chart range" });
    expect(ranges).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "1D" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "3Y" })).not.toBeInTheDocument();
  });

  it("surfaces a history failure instead of showing an empty chart", async () => {
    vi.mocked(getHistory).mockRejectedValue(new Error("History is unavailable"));

    render(<SymbolChartPanel item={item()} state={undefined} />);

    await waitFor(() => expect(screen.getByText(/History is unavailable/)).toBeInTheDocument());
  });
});
