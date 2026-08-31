import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfileView from "./ProfileView";
import { logoutEverywhere, type AuthUser, type WatchlistItem } from "../lib/api";

vi.mock("../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api")>()),
  logoutEverywhere: vi.fn(),
}));

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
  const onSignedOutEverywhere = vi.fn();
  render(
    <ProfileView
      user={authUser}
      items={items}
      onSaveHoldings={onSaveHoldings}
      onClearHoldings={onClearHoldings}
      onSignedOutEverywhere={onSignedOutEverywhere}
    />
  );
  return { onSaveHoldings, onClearHoldings, onSignedOutEverywhere, user: userEvent.setup() };
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

  // Without this, closing the form leaves focus on a button that just
  // unmounted, and the browser drops focus to <body>.
  it("returns focus to the trigger when the form is cancelled", async () => {
    const { user: u } = setup([item({ symbol: "AAPL" })]);
    const trigger = screen.getByRole("button", { name: "Add holdings for AAPL" });

    await u.click(trigger);
    await u.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("button", { name: "Add holdings for AAPL" })).toHaveFocus();
  });

  it("returns focus to the trigger after a successful save", async () => {
    const { user: u } = setup([item({ symbol: "AAPL" })]);

    await u.click(screen.getByRole("button", { name: "Add holdings for AAPL" }));
    await u.type(screen.getByLabelText("Shares"), "5");
    await u.type(screen.getByLabelText("Cost per share"), "100");
    await u.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Add holdings for AAPL" })).toHaveFocus()
    );
  });

  it("only opens one row's form at a time", async () => {
    const { user: u } = setup([item({ symbol: "AAPL" }), item({ symbol: "TSLA" })]);

    await u.click(screen.getByRole("button", { name: "Add holdings for AAPL" }));
    await u.click(screen.getByRole("button", { name: "Add holdings for TSLA" }));

    expect(screen.getByRole("form", { name: "Holdings for TSLA" })).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Holdings for AAPL" })).not.toBeInTheDocument();
  });
});

describe("ProfileView — sign out everywhere", () => {
  // It's irreversible for every other device, so it asks first rather than
  // firing on a single click next to routine profile controls.
  it("asks for confirmation before ending anything", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Sign out everywhere" }));

    expect(logoutEverywhere).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /yes, sign out everywhere/i })).toBeInTheDocument();
  });

  it("backs out cleanly on cancel", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Sign out everywhere" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(logoutEverywhere).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign out everywhere" })).toBeInTheDocument();
  });

  it("ends the sessions and tells the app once confirmed", async () => {
    vi.mocked(logoutEverywhere).mockResolvedValue(undefined);
    const { user, onSignedOutEverywhere } = setup();

    await user.click(screen.getByRole("button", { name: "Sign out everywhere" }));
    await user.click(screen.getByRole("button", { name: /yes, sign out everywhere/i }));

    await waitFor(() => expect(logoutEverywhere).toHaveBeenCalledTimes(1));
    expect(onSignedOutEverywhere).toHaveBeenCalledTimes(1);
  });

  // Anyone reaching for this has usually lost a device. Failing silently is
  // the worst outcome available.
  it("surfaces a failure instead of pretending it worked", async () => {
    vi.mocked(logoutEverywhere).mockRejectedValue(new Error("Network request failed"));
    const { user, onSignedOutEverywhere } = setup();

    await user.click(screen.getByRole("button", { name: "Sign out everywhere" }));
    await user.click(screen.getByRole("button", { name: /yes, sign out everywhere/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/network request failed/i));
    expect(onSignedOutEverywhere).not.toHaveBeenCalled();
  });
});
