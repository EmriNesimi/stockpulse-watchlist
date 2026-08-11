export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

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

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  threshold: number;
  direction: "above" | "below";
  createdAt: string;
  triggeredAt: string | null;
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

export function getAlerts(): Promise<{ alerts: PriceAlert[] }> {
  return request("/api/alerts");
}

export function createAlert(
  symbol: string,
  threshold: number,
  direction: "above" | "below"
): Promise<{ alert: PriceAlert }> {
  return request("/api/alerts", {
    method: "POST",
    body: JSON.stringify({ symbol, threshold, direction }),
  });
}

export function removeAlert(id: string): Promise<void> {
  return request(`/api/alerts/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function getHistory(symbol: string, days = 30): Promise<{ candles: Candle[]; source: string }> {
  return request(`/api/history/${encodeURIComponent(symbol)}?days=${days}`);
}
