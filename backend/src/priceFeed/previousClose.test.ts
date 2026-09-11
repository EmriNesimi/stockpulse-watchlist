import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../logger";
import { fetchPreviousClose } from "./previousClose";

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

describe("fetchPreviousClose", () => {
  it("returns the close from the first result", async () => {
    stubFetch(async () => ({ ok: true, json: async () => ({ results: [{ c: 187.42 }] }) }));

    await expect(fetchPreviousClose("AAPL")).resolves.toBe(187.42);
  });

  // Every failure path returned null and said nothing. If Massive starts
  // rejecting, previous close quietly disappears from every row and the logs
  // give you no reason to look at Massive at all.
  it("says why it gave up when the request throws", async () => {
    stubFetch(async () => {
      throw new Error("connect ETIMEDOUT");
    });

    await expect(fetchPreviousClose("AAPL")).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("previous-close"),
      expect.objectContaining({ symbol: "AAPL" })
    );
  });

  it("says why it gave up on a non-ok response", async () => {
    stubFetch(async () => ({ ok: false, status: 429, json: async () => ({}) }));

    await expect(fetchPreviousClose("AAPL")).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("previous-close"),
      expect.objectContaining({ symbol: "AAPL", status: 429 })
    );
  });

  // A symbol with no prior session — a fresh listing — is not a failure.
  it("returns null without warning when there are no results", async () => {
    stubFetch(async () => ({ ok: true, json: async () => ({ results: [] }) }));

    await expect(fetchPreviousClose("NEWCO")).resolves.toBeNull();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
