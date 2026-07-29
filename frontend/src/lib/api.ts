const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export interface TickerResult {
  symbol: string;
  name: string;
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string | null;
  addedAt: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function searchTickers(query: string): Promise<{ results: TickerResult[]; source: string }> {
  return request(`/api/search?q=${encodeURIComponent(query)}`);
}

export function getWatchlist(): Promise<{ items: WatchlistItem[] }> {
  return request("/api/watchlist");
}

export function addToWatchlist(symbol: string, name?: string): Promise<{ item: WatchlistItem }> {
  return request("/api/watchlist", {
    method: "POST",
    body: JSON.stringify({ symbol, name }),
  });
}

export function removeFromWatchlist(symbol: string): Promise<void> {
  return request(`/api/watchlist/${encodeURIComponent(symbol)}`, { method: "DELETE" });
}
