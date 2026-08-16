import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HoldingsForm from "./HoldingsForm";
import type { WatchlistItem } from "../lib/api";

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

function setup(overrides: Partial<WatchlistItem> = {}) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onClear = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();
  render(<HoldingsForm item={item(overrides)} onSave={onSave} onClear={onClear} onCancel={onCancel} />);
  return { onSave, onClear, onCancel, user: userEvent.setup() };
}

describe("HoldingsForm", () => {
  it("starts empty for a ticker with no position", () => {
    setup();

    expect(screen.getByLabelText("Shares")).toHaveValue(null);
    expect(screen.getByLabelText("Cost per share")).toHaveValue(null);
  });

  it("pre-fills the existing position", () => {
    setup({ shares: 10, costBasis: 150.5 });

    expect(screen.getByLabelText("Shares")).toHaveValue(10);
    expect(screen.getByLabelText("Cost per share")).toHaveValue(150.5);
  });

  it("saves the parsed numbers", async () => {
    const { onSave, user } = setup();

    await user.type(screen.getByLabelText("Shares"), "12");
    await user.type(screen.getByLabelText("Cost per share"), "99.5");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(12, 99.5));
  });

  it("refuses to submit with only one field filled, since the backend needs both", async () => {
    const { onSave, user } = setup();

    await user.type(screen.getByLabelText("Shares"), "12");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("both need a positive number");
  });

  it("rejects zero and negative values without calling the server", async () => {
    const { onSave, user } = setup();

    await user.type(screen.getByLabelText("Shares"), "0");
    await user.type(screen.getByLabelText("Cost per share"), "10");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Shares")).toHaveAttribute("aria-invalid", "true");
  });

  it("rejects a value past the backend's ceiling", async () => {
    const { onSave, user } = setup();

    await user.type(screen.getByLabelText("Shares"), "5");
    await user.type(screen.getByLabelText("Cost per share"), "20000000"); // over the $10M cap
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it("surfaces a save failure instead of pretending it worked", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("Watchlist item not found"));
    const user = userEvent.setup();
    render(<HoldingsForm item={item()} onSave={onSave} onClear={vi.fn()} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText("Shares"), "12");
    await user.type(screen.getByLabelText("Cost per share"), "99");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Watchlist item not found"));
  });

  it("offers Clear only when there's a position to clear", () => {
    const { onCancel } = setup();
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("clears an existing position", async () => {
    const { onClear, user } = setup({ shares: 10, costBasis: 150 });

    await user.click(screen.getByRole("button", { name: "Clear" }));

    await waitFor(() => expect(onClear).toHaveBeenCalledTimes(1));
  });

  it("cancels without saving", async () => {
    const { onSave, onCancel, user } = setup();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
