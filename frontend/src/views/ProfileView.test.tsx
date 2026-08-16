import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfileView from "./ProfileView";
import type { AuthUser, WatchlistItem } from "../lib/api";

function user(overrides: Partial<AuthUser> = {}): AuthUser {
  return { id: "u1", email: "trader@example.com", emailVerified: true, ...overrides };
}

function item(overrides: Partial<WatchlistItem> = {}): WatchlistItem {
  return {
    id: overrides.symbol ?? "1",
    symbol: "AAPL",
    name: "Apple Inc.",
    addedAt: "2026-01-01",
    shares: null,
    costBasis: null,
    ...overrides,
  };
}

function setup(items: WatchlistItem[] = [], authUser = user()) {
  const onSaveHoldings = vi.fn().mockResolvedValue(undefined);
  const onClearHoldings = vi.fn().mockResolvedValue(undefined);
  render(
    <ProfileView
      user={authUser}
      items={items}
      onSaveHoldings={onSaveHoldings}
      onClearHoldings={onClearHoldings}
    />
  );
  return { onSaveHoldings, onClearHoldings, user: userEvent.setup() };
}

describe("ProfileView", () => {
  it("shows the account email", () => {
    setup();
    expect(screen.getByText("trader@example.com")).toBeInTheDocument();
  });

  it("shows verified status", () => {
    setup([], user({ emailVerified: true }));
    expect(screen.getByText("Email verified")).toBeInTheDocument();
  });

  it("shows unverified status", () => {
    setup([], user({ emailVerified: false }));
    expect(screen.getByText("Email not verified")).toBeInTheDocument();
  });

  it("prompts when the watchlist is empty", () => {
    setup([]);
    expect(screen.getByText(/Nothing on your watchlist yet/)).toBeInTheDocument();
  });

  it("labels a ticker with no position as watching only", () => {
    setup([item({ symbol: "AAPL" })]);

    expect(screen.getByText("Watching only")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add holdings for AAPL" })).toBeInTheDocument();
  });

  it("shows the existing position and offers to edit it", () => {
    setup([item({ symbol: "AAPL", shares: 10, costBasis: 150 })]);

    expect(screen.getByText("10 @ $150.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit holdings for AAPL" })).toBeInTheDocument();
  });

  it("keeps the form closed until the row is opened", () => {
    setup([item({ symbol: "AAPL" })]);
    expect(screen.queryByLabelText("Shares")).not.toBeInTheDocument();
  });

  it("saves holdings for the right symbol and closes the form", async () => {
    const { onSaveHoldings, user: u } = setup([item({ symbol: "AAPL" }), item({ symbol: "TSLA" })]);

    await u.click(screen.getByRole("button", { name: "Add holdings for TSLA" }));
    await u.type(screen.getByLabelText("Shares"), "4");
    await u.type(screen.getByLabelText("Cost per share"), "220");
    await u.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSaveHoldings).toHaveBeenCalledWith("TSLA", 4, 220));
    await waitFor(() => expect(screen.queryByLabelText("Shares")).not.toBeInTheDocument());
  });

  it("clears a position", async () => {
    const { onClearHoldings, user: u } = setup([item({ symbol: "AAPL", shares: 10, costBasis: 150 })]);

    await u.click(screen.getByRole("button", { name: "Edit holdings for AAPL" }));
    await u.click(screen.getByRole("button", { name: "Clear" }));

    await waitFor(() => expect(onClearHoldings).toHaveBeenCalledWith("AAPL"));
  });

  it("only opens one row's form at a time", async () => {
    const { user: u } = setup([item({ symbol: "AAPL" }), item({ symbol: "TSLA" })]);

    await u.click(screen.getByRole("button", { name: "Add holdings for AAPL" }));
    await u.click(screen.getByRole("button", { name: "Add holdings for TSLA" }));

    expect(screen.getByRole("form", { name: "Holdings for TSLA" })).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Holdings for AAPL" })).not.toBeInTheDocument();
  });
});
