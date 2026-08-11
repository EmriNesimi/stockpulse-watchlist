import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useHistory } from "./useHistory";
import * as api from "../lib/api";

describe("useHistory", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not fetch when symbol is null", () => {
    const spy = vi.spyOn(api, "getHistory");
    const { result } = renderHook(() => useHistory(null));

    expect(spy).not.toHaveBeenCalled();
    expect(result.current).toEqual({ candles: [], loading: false, error: null });
  });

  it("fetches candles for a symbol and reports loading state", async () => {
    const candles = [{ time: 1, open: 1, high: 2, low: 1, close: 2, volume: 100 }];
    vi.spyOn(api, "getHistory").mockResolvedValueOnce({ candles, source: "simulated" });

    const { result } = renderHook(() => useHistory("AAPL"));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.candles).toEqual(candles);
    expect(result.current.error).toBeNull();
  });

  it("passes the days parameter through", async () => {
    const spy = vi.spyOn(api, "getHistory").mockResolvedValueOnce({ candles: [], source: "simulated" });

    renderHook(() => useHistory("AAPL", 90));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("AAPL", 90));
  });

  it("surfaces an error message when the fetch fails", async () => {
    vi.spyOn(api, "getHistory").mockRejectedValueOnce(new Error("Rate limited"));

    const { result } = renderHook(() => useHistory("AAPL"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Rate limited");
    expect(result.current.candles).toEqual([]);
  });

  it("clears candles when symbol goes back to null", async () => {
    const candles = [{ time: 1, open: 1, high: 2, low: 1, close: 2, volume: 100 }];
    vi.spyOn(api, "getHistory").mockResolvedValueOnce({ candles, source: "simulated" });

    const { result, rerender } = renderHook(({ symbol }) => useHistory(symbol), {
      initialProps: { symbol: "AAPL" as string | null },
    });

    await waitFor(() => expect(result.current.candles).toEqual(candles));

    rerender({ symbol: null });
    expect(result.current.candles).toEqual([]);
  });
});
