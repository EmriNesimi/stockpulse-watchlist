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
  // Set together or not at all - the backend rejects one without the other.
  // Null means "watching but not holding", which is the default.
  shares: number | null;
  costBasis: number | null;
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

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    // The session cookie is set by the backend as a cross-origin cookie
    // (different port in dev) - without this, fetch never sends it back.
    credentials: "include",
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

// Pass nulls to clear a position back to watch-only. The backend enforces
// that shares and costBasis move together, so they're not independently
// optional here either.
export function updateHoldings(
  symbol: string,
  shares: number | null,
  costBasis: number | null
): Promise<{ item: WatchlistItem }> {
  return request(`/api/watchlist/${encodeURIComponent(symbol)}`, {
    method: "PATCH",
    body: JSON.stringify({ shares, costBasis }),
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

export function signup(email: string, password: string): Promise<{ user: AuthUser }> {
  return request("/api/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function login(email: string, password: string): Promise<{ user: AuthUser }> {
  return request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function logout(): Promise<void> {
  return request("/api/auth/logout", { method: "POST" });
}

export function getCurrentUser(): Promise<{ user: AuthUser }> {
  return request("/api/auth/me");
}

export function verifyEmail(token: string): Promise<{ user: AuthUser }> {
  return request(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
}

export function resendVerificationEmail(): Promise<void> {
  return request("/api/auth/resend-verification", { method: "POST" });
}
