import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../logger";
import { fetchMassiveHistory } from "./fetchHistory";

vi.mock("../env", () => ({ env: { massiveApiKey: "test-key" } }));

beforeEach(() => {
  vi.spyOn(logger, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function stubFetch(impl: () => Promise<unknown>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

const bar = { t: 1_700_000_000_000, o: 1, h: 2, l: 0.5, c: 1.5, v: 100 };

describe("fetchMassiveHistory", () => {
  it("maps bars into candles", async () => {
    stubFetch(async () => ({ ok: true, json: async () => ({ results: [bar] }) }));

    const candles = await fetchMassiveHistory("AAPL", 30);

    expect(candles).toEqual([
      { time: "2023-11-14", open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
    ]);
  });

  // Returning null here doesn't blank the chart, it swaps in generated
  // candles. Silently serving invented prices as though Massive answered is
  // the one failure here worth being loud about.
  it("says why it fell back when the request throws", async () => {
    stubFetch(async () => {
      throw new Error("connect ETIMEDOUT");
    });

    await expect(fetchMassiveHistory("AAPL", 30)).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("history"),
      expect.objectContaining({ symbol: "AAPL" })
    );
  });

  it("says why it fell back on a non-ok response", async () => {
    stubFetch(async () => ({ ok: false, status: 429, json: async () => ({}) }));

    await expect(fetchMassiveHistory("AAPL", 30)).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("history"),
      expect.objectContaining({ symbol: "AAPL", status: 429 })
    );
  });

  // A symbol Massive knows but has no bars for in the window isn't a fault.
  it("returns null without warning on an empty result set", async () => {
    stubFetch(async () => ({ ok: true, json: async () => ({ results: [] }) }));

    await expect(fetchMassiveHistory("AAPL", 30)).resolves.toBeNull();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
