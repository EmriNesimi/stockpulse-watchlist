import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StockDetailView from "./StockDetailView";
import { getHistory } from "../lib/api";
import type { WatchlistItem } from "../lib/api";
import type { PriceState } from "../types";

vi.mock("../lib/api", () => ({ getHistory: vi.fn() }));

function item(overrides: Partial<WatchlistItem> = {}): WatchlistItem {
  return {
    id: "1",
    symbol: "AAPL",
    name: "Apple Inc.",
    addedAt: "2026-01-01",
    shares: null,
    costBasis: null,
    ...overrides,
  };
}

function price(value: number): PriceState {
  return { price: value, changePercent: 0, source: "simulated", history: [] };
}

beforeEach(() => {
  vi.mocked(getHistory).mockResolvedValue({ candles: [], source: "simulated" });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("StockDetailView", () => {
  it("shows the chart panel for the symbol", async () => {
    render(<StockDetailView item={item()} prices={{ AAPL: price(120) }} onBack={vi.fn()} onCreateAlert={vi.fn()} />);

    expect(screen.getByText("AAPL")).toBeInTheDocument();
    await waitFor(() => expect(getHistory).toHaveBeenCalledWith("AAPL", 30));
  });

  it("goes back to the dashboard", async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<StockDetailView item={item()} prices={{}} onBack={onBack} onCreateAlert={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Back to dashboard/ }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("hides the position panel for a ticker that's only watched", () => {
    render(<StockDetailView item={item()} prices={{ AAPL: price(120) }} onBack={vi.fn()} onCreateAlert={vi.fn()} />);

    expect(screen.queryByText("Your position")).not.toBeInTheDocument();
  });

  it("shows the position figures when the ticker is held", () => {
    render(
      <StockDetailView
        item={item({ shares: 10, costBasis: 100 })}
        prices={{ AAPL: price(120) }}
        onBack={vi.fn()}
        onCreateAlert={vi.fn()}
      />
    );

    const panel = within(screen.getByRole("region", { name: "Your position" }));
    expect(panel.getByText("10")).toBeInTheDocument();
    expect(panel.getByText("$100.00")).toBeInTheDocument();
    expect(panel.getByText("$1,200.00")).toBeInTheDocument();
    expect(panel.getByText("+$200.00 (+20.00%)")).toBeInTheDocument();
  });

  it("creates an alert for this symbol", async () => {
    const onCreateAlert = vi.fn();
    const user = userEvent.setup();
    render(
      <StockDetailView item={item()} prices={{ AAPL: price(120) }} onBack={vi.fn()} onCreateAlert={onCreateAlert} />
    );

    const threshold = screen.getByLabelText("Price threshold for AAPL alert");
    await user.clear(threshold);
    await user.type(threshold, "200");
    await user.click(screen.getByRole("button", { name: "Set" }));

    expect(onCreateAlert).toHaveBeenCalledWith("AAPL", 200, "above");
  });

  it("explains itself if the ticker was removed while the screen was open", () => {
    render(<StockDetailView item={undefined} prices={{}} onBack={vi.fn()} onCreateAlert={vi.fn()} />);

    expect(screen.getByText(/isn't on your watchlist any more/)).toBeInTheDocument();
    expect(getHistory).not.toHaveBeenCalled();
  });
});
