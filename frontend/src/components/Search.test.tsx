import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Search from "./Search";
import { searchTickers } from "../lib/api";

vi.mock("../lib/api", () => ({
  searchTickers: vi.fn(),
}));

// Real timers, not fake ones — the 300ms debounce is short enough to just
// wait out in real time. Combining vi.useFakeTimers() with userEvent +
// waitFor deadlocked (userEvent's own internal delays and waitFor's polling
// both rely on timers that never got told to advance), so this is the
// simpler and actually-working approach.
beforeEach(() => {
  vi.mocked(searchTickers).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Search", () => {
  it("doesn't show a results list before anything is typed", () => {
    render(<Search onAdd={vi.fn()} alreadyAdded={() => false} />);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("searches (debounced) and shows the results", async () => {
    vi.mocked(searchTickers).mockResolvedValue({
      results: [{ symbol: "AAPL", name: "Apple Inc." }],
      source: "massive",
    });
    const user = userEvent.setup();
    render(<Search onAdd={vi.fn()} alreadyAdded={() => false} />);

    await user.type(screen.getByLabelText(/search for a stock ticker/i), "apple");

    await waitFor(() => expect(searchTickers).toHaveBeenCalledWith("apple"), { timeout: 2000 });
    await waitFor(() => expect(screen.getByRole("option", { name: /AAPL/ })).toBeInTheDocument());
  }, 10000);

  it("shows 'No matches' when the search comes back empty", async () => {
    vi.mocked(searchTickers).mockResolvedValue({ results: [], source: "massive" });
    const user = userEvent.setup();
    render(<Search onAdd={vi.fn()} alreadyAdded={() => false} />);

    await user.type(screen.getByLabelText(/search for a stock ticker/i), "zzz");

    await waitFor(() => expect(screen.getByText(/no matches for "zzz"/i)).toBeInTheDocument(), {
      timeout: 2000,
    });
  }, 10000);

  it("shows an error message when the search fails", async () => {
    vi.mocked(searchTickers).mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    render(<Search onAdd={vi.fn()} alreadyAdded={() => false} />);

    await user.type(screen.getByLabelText(/search for a stock ticker/i), "apple");

    await waitFor(
      () => expect(screen.getByText(/couldn't reach search right now/i)).toBeInTheDocument(),
      { timeout: 2000 }
    );
  }, 10000);

  it("calls onAdd with the ticker when a result is clicked", async () => {
    vi.mocked(searchTickers).mockResolvedValue({
      results: [{ symbol: "AAPL", name: "Apple Inc." }],
      source: "massive",
    });
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<Search onAdd={onAdd} alreadyAdded={() => false} />);

    await user.type(screen.getByLabelText(/search for a stock ticker/i), "apple");
    await waitFor(() => screen.getByRole("option", { name: /AAPL/ }), { timeout: 2000 });
    await user.click(screen.getByRole("option", { name: /AAPL/ }));

    expect(onAdd).toHaveBeenCalledWith({ symbol: "AAPL", name: "Apple Inc." });
  }, 10000);

  it("disables a result that's already on the watchlist", async () => {
    vi.mocked(searchTickers).mockResolvedValue({
      results: [{ symbol: "AAPL", name: "Apple Inc." }],
      source: "massive",
    });
    const user = userEvent.setup();
    render(<Search onAdd={vi.fn()} alreadyAdded={(symbol) => symbol === "AAPL"} />);

    await user.type(screen.getByLabelText(/search for a stock ticker/i), "apple");

    await waitFor(() => expect(screen.getByRole("option", { name: /AAPL/ })).toBeDisabled(), {
      timeout: 2000,
    });
  }, 10000);

  it("clears the query and closes the results on Escape", async () => {
    vi.mocked(searchTickers).mockResolvedValue({
      results: [{ symbol: "AAPL", name: "Apple Inc." }],
      source: "massive",
    });
    const user = userEvent.setup();
    render(<Search onAdd={vi.fn()} alreadyAdded={() => false} />);

    const input = screen.getByLabelText(/search for a stock ticker/i);
    await user.type(input, "apple");
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument(), { timeout: 2000 });

    await user.keyboard("{Escape}");

    expect(input).toHaveValue(""); // clears immediately, no debounce on the input itself
    // The listbox is gated on the *debounced* query though, so it takes
    // another ~300ms to catch up to the now-empty value and unmount.
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument(), {
      timeout: 2000,
    });
  }, 10000);

  it("disables the input and shows a full-watchlist message when at capacity", () => {
    render(<Search onAdd={vi.fn()} alreadyAdded={() => false} atCapacity />);

    const input = screen.getByLabelText(/search for a stock ticker/i);
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("placeholder", expect.stringMatching(/watchlist is full/i));
  });

  it("doesn't show search results while at capacity, even with a typed query", async () => {
    vi.mocked(searchTickers).mockResolvedValue({
      results: [{ symbol: "AAPL", name: "Apple Inc." }],
      source: "massive",
    });
    render(<Search onAdd={vi.fn()} alreadyAdded={() => false} atCapacity />);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("is enabled by default (atCapacity omitted)", () => {
    render(<Search onAdd={vi.fn()} alreadyAdded={() => false} />);
    expect(screen.getByLabelText(/search for a stock ticker/i)).not.toBeDisabled();
  });
});
