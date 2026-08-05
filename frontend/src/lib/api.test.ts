import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  API_BASE,
  addToWatchlist,
  createAlert,
  getAlerts,
  getWatchlist,
  removeAlert,
  removeFromWatchlist,
  searchTickers,
} from "./api";

function jsonResponse(body: unknown, init: Partial<Response> = {}): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    ...init,
  } as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchTickers", () => {
  it("hits the search endpoint with the query URL-encoded", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ results: [{ symbol: "AAPL", name: "Apple Inc." }], source: "massive" })
    );

    const result = await searchTickers("apple inc");

    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE}/api/search?q=apple%20inc`,
      expect.objectContaining({ headers: expect.objectContaining({ "Content-Type": "application/json" }) })
    );
    expect(result.results).toEqual([{ symbol: "AAPL", name: "Apple Inc." }]);
  });
});

describe("getWatchlist", () => {
  it("GETs /api/watchlist and returns the items", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ items: [{ id: "1", symbol: "AAPL" }] }));

    const result = await getWatchlist();

    expect(fetch).toHaveBeenCalledWith(`${API_BASE}/api/watchlist`, expect.anything());
    expect(result.items).toHaveLength(1);
  });
});

describe("addToWatchlist", () => {
  it("POSTs the symbol and name as JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ item: { id: "1", symbol: "AAPL", name: "Apple Inc.", addedAt: "now" } }, { status: 201 })
    );

    await addToWatchlist("AAPL", "Apple Inc.");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ symbol: "AAPL", name: "Apple Inc." });
  });

  it("throws with the server's error message on a non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ error: "AAPL is already on the watchlist" }, { ok: false, status: 409 })
    );

    await expect(addToWatchlist("AAPL")).rejects.toThrow("AAPL is already on the watchlist");
  });

  it("falls back to a generic error if the error response body isn't valid JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("not json");
      },
    } as unknown as Response);

    await expect(addToWatchlist("AAPL")).rejects.toThrow("Request failed with status 500");
  });
});

describe("removeFromWatchlist", () => {
  it("DELETEs the URL-encoded symbol", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(undefined, { status: 204 }));

    await removeFromWatchlist("BRK.B");

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/watchlist/BRK.B`);
    expect(init?.method).toBe("DELETE");
  });

  it("resolves without trying to parse a body on 204 No Content", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => {
        throw new Error("there's no body to parse on a 204");
      },
    } as unknown as Response);

    await expect(removeFromWatchlist("AAPL")).resolves.toBeUndefined();
  });
});

describe("getAlerts", () => {
  it("GETs /api/alerts and returns the alerts", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ alerts: [{ id: "1", symbol: "AAPL", threshold: 200, direction: "above" }] })
    );

    const result = await getAlerts();

    expect(fetch).toHaveBeenCalledWith(`${API_BASE}/api/alerts`, expect.anything());
    expect(result.alerts).toHaveLength(1);
  });
});

describe("createAlert", () => {
  it("POSTs symbol, threshold, and direction as JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(
        { alert: { id: "1", symbol: "AAPL", threshold: 200, direction: "above", createdAt: "now", triggeredAt: null } },
        { status: 201 }
      )
    );

    await createAlert("AAPL", 200, "above");

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/alerts`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ symbol: "AAPL", threshold: 200, direction: "above" });
  });

  it("throws with the server's error message on a non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ error: "Not a valid ticker symbol" }, { ok: false, status: 400 })
    );

    await expect(createAlert("NOT_VALID", 200, "above")).rejects.toThrow("Not a valid ticker symbol");
  });
});

describe("removeAlert", () => {
  it("DELETEs the URL-encoded alert id", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(undefined, { status: 204 }));

    await removeAlert("alert-1");

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/alerts/alert-1`);
    expect(init?.method).toBe("DELETE");
  });
});
