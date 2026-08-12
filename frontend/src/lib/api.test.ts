import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  API_BASE,
  addToWatchlist,
  createAlert,
  getAlerts,
  getCurrentUser,
  getHistory,
  getWatchlist,
  login,
  logout,
  removeAlert,
  removeFromWatchlist,
  searchTickers,
  signup,
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

describe("getHistory", () => {
  it("GETs the history endpoint with a default 30-day range", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ candles: [{ time: 1, open: 1, high: 2, low: 1, close: 2, volume: 100 }], source: "simulated" })
    );

    const result = await getHistory("AAPL");

    expect(fetch).toHaveBeenCalledWith(`${API_BASE}/api/history/AAPL?days=30`, expect.anything());
    expect(result.candles).toHaveLength(1);
  });

  it("passes a custom days value and URL-encodes the symbol", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ candles: [], source: "simulated" }));

    await getHistory("BRK.B", 90);

    expect(fetch).toHaveBeenCalledWith(`${API_BASE}/api/history/BRK.B?days=90`, expect.anything());
  });
});

describe("every request", () => {
  it("sends credentials: include so the session cookie round-trips cross-origin", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ items: [] }));

    await getWatchlist();

    expect(fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ credentials: "include" })
    );
  });
});

describe("signup", () => {
  it("POSTs the email and password", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ user: { id: "1", email: "a@example.com" } }, { status: 201 })
    );

    await signup("a@example.com", "hunter22");

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/auth/signup`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ email: "a@example.com", password: "hunter22" });
  });

  it("throws with the server's error message on a non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ error: "An account with that email already exists" }, { ok: false, status: 409 })
    );

    await expect(signup("a@example.com", "hunter22")).rejects.toThrow("An account with that email already exists");
  });
});

describe("login", () => {
  it("POSTs the email and password", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ user: { id: "1", email: "a@example.com" } }));

    await login("a@example.com", "hunter22");

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/auth/login`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ email: "a@example.com", password: "hunter22" });
  });

  it("throws with the server's error message on invalid credentials", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ error: "Invalid email or password" }, { ok: false, status: 401 })
    );

    await expect(login("a@example.com", "wrong")).rejects.toThrow("Invalid email or password");
  });
});

describe("logout", () => {
  it("POSTs to /api/auth/logout", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(undefined, { status: 204 }));

    await logout();

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/auth/logout`);
    expect(init?.method).toBe("POST");
  });
});

describe("getCurrentUser", () => {
  it("GETs /api/auth/me and returns the user", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ user: { id: "1", email: "a@example.com" } }));

    const result = await getCurrentUser();

    expect(fetch).toHaveBeenCalledWith(`${API_BASE}/api/auth/me`, expect.anything());
    expect(result.user.email).toBe("a@example.com");
  });

  it("throws when there's no session", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "Not signed in" }, { ok: false, status: 401 }));

    await expect(getCurrentUser()).rejects.toThrow("Not signed in");
  });
});
