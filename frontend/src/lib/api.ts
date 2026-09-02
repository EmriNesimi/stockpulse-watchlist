import {
  parseAlertResponse,
  parseAlertsResponse,
  parseHistoryResponse,
  parseWatchlistItemResponse,
  parseWatchlistResponse,
} from "./apiShapes";

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

/**
 * `parse` is optional on purpose. The shapes worth validating are the ones
 * whose numbers reach arithmetic; requiring a parser for every endpoint would
 * mean writing one for `{ message: string }` too, which buys nothing.
 */
async function request<T>(path: string, init?: RequestInit, parse?: (raw: unknown) => T): Promise<T> {
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

  const body: unknown = await res.json();
  return parse ? parse(body) : (body as T);
}

export function searchTickers(query: string): Promise<{ results: TickerResult[]; source: string }> {
  return request(`/api/search?q=${encodeURIComponent(query)}`);
}

export function getWatchlist(): Promise<{ items: WatchlistItem[] }> {
  return request("/api/watchlist", undefined, parseWatchlistResponse);
}

export function addToWatchlist(symbol: string, name?: string): Promise<{ item: WatchlistItem }> {
  return request(
    "/api/watchlist",
    { method: "POST", body: JSON.stringify({ symbol, name }) },
    parseWatchlistItemResponse
  );
}

// Pass nulls to clear a position back to watch-only. The backend enforces
// that shares and costBasis move together, so they're not independently
// optional here either.
export function updateHoldings(
  symbol: string,
  shares: number | null,
  costBasis: number | null
): Promise<{ item: WatchlistItem }> {
  return request(
    `/api/watchlist/${encodeURIComponent(symbol)}`,
    { method: "PATCH", body: JSON.stringify({ shares, costBasis }) },
    parseWatchlistItemResponse
  );
}

export function removeFromWatchlist(symbol: string): Promise<void> {
  return request(`/api/watchlist/${encodeURIComponent(symbol)}`, { method: "DELETE" });
}

export function getAlerts(): Promise<{ alerts: PriceAlert[] }> {
  return request("/api/alerts", undefined, parseAlertsResponse);
}

export function createAlert(
  symbol: string,
  threshold: number,
  direction: "above" | "below"
): Promise<{ alert: PriceAlert }> {
  return request(
    "/api/alerts",
    { method: "POST", body: JSON.stringify({ symbol, threshold, direction }) },
    parseAlertResponse
  );
}

export function removeAlert(id: string): Promise<void> {
  return request(`/api/alerts/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function getHistory(symbol: string, days = 30): Promise<{ candles: Candle[]; source: string }> {
  return request(`/api/history/${encodeURIComponent(symbol)}?days=${days}`, undefined, parseHistoryResponse);
}

// Deliberately returns no user and no session: the backend answers the same
// way whether or not the address was already registered, so signing in is a
// separate step. See the signup route for why.
export function signup(email: string, password: string): Promise<{ message: string }> {
  return request("/api/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function login(email: string, password: string): Promise<{ user: AuthUser }> {
  return request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function logout(): Promise<void> {
  return request("/api/auth/logout", { method: "POST" });
}

// Ends every session for the account, this one included — the backend bumps
// the user's session epoch, which invalidates every cookie issued before now.
export function logoutEverywhere(): Promise<void> {
  return request("/api/auth/logout-everywhere", { method: "POST" });
}

export function getCurrentUser(): Promise<{ user: AuthUser }> {
  return request("/api/auth/me");
}

export function verifyEmail(token: string): Promise<{ user: AuthUser }> {
  return request("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) });
}

export function resendVerificationEmail(): Promise<void> {
  return request("/api/auth/resend-verification", { method: "POST" });
}

// Answers 202 whether or not the address has an account, so there is no
// success/failure to branch on here — only the neutral message.
export function requestPasswordReset(email: string): Promise<{ message: string }> {
  return request("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
}

export function resetPassword(token: string, password: string): Promise<void> {
  return request("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
}
