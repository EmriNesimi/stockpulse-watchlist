// Runtime validation for REST responses.
//
// wsMessages.ts already does this for the WebSocket, for a reason that applies
// just as well here: `res.json()` returns `any`, and handing that to a typed
// signature is an unchecked cast. The gap was never that REST is safer — it's
// the same backend either way — but that only one side had been written.
//
// Scoped to the shapes whose numbers reach arithmetic. A malformed `message`
// string renders as nonsense and someone files a bug; a malformed `shares`
// silently poisons every wallet total on the screen, and the app is built to
// show a dash rather than a number it can't stand behind.
//
// Hand-rolled to match wsMessages rather than pulling zod into the bundle.
import { isFiniteNumber, isNonEmptyString, isNullableFiniteNumber, isNullableString, isRecord } from "./guards";
import type { Candle, PriceAlert, WatchlistItem } from "./api";

export class ResponseShapeError extends Error {
  constructor(what: string) {
    super(`The server sent a ${what} we couldn't read.`);
    this.name = "ResponseShapeError";
  }
}

function toWatchlistItem(raw: unknown): WatchlistItem | null {
  if (!isRecord(raw)) return null;
  if (!isNonEmptyString(raw.id) || !isNonEmptyString(raw.symbol)) return null;
  if (!isNullableString(raw.name) || !isNonEmptyString(raw.addedAt)) return null;
  // Both or neither — the backend enforces it, and the wallet maths assumes it.
  if (!isNullableFiniteNumber(raw.shares) || !isNullableFiniteNumber(raw.costBasis)) return null;
  if ((raw.shares === null) !== (raw.costBasis === null)) return null;

  return {
    id: raw.id,
    symbol: raw.symbol,
    name: raw.name,
    addedAt: raw.addedAt,
    shares: raw.shares,
    costBasis: raw.costBasis,
  };
}

function toCandle(raw: unknown): Candle | null {
  if (!isRecord(raw)) return null;
  const fields = ["time", "open", "high", "low", "close", "volume"] as const;
  if (!fields.every((f) => isFiniteNumber(raw[f]))) return null;

  return {
    time: raw.time as number,
    open: raw.open as number,
    high: raw.high as number,
    low: raw.low as number,
    close: raw.close as number,
    volume: raw.volume as number,
  };
}

function toPriceAlert(raw: unknown): PriceAlert | null {
  if (!isRecord(raw)) return null;
  if (!isNonEmptyString(raw.id) || !isNonEmptyString(raw.symbol)) return null;
  if (!isFiniteNumber(raw.threshold)) return null;
  if (raw.direction !== "above" && raw.direction !== "below") return null;
  if (!isNonEmptyString(raw.createdAt) || !isNullableString(raw.triggeredAt)) return null;

  return {
    id: raw.id,
    symbol: raw.symbol,
    threshold: raw.threshold,
    direction: raw.direction,
    createdAt: raw.createdAt,
    triggeredAt: raw.triggeredAt,
  };
}

function listOf<T>(each: (raw: unknown) => T | null, what: string) {
  return (raw: unknown): T[] => {
    if (!Array.isArray(raw)) throw new ResponseShapeError(what);
    return raw.map((entry) => {
      const parsed = each(entry);
      // One bad entry fails the batch rather than being dropped: silently
      // rendering four of five holdings is worse than an error, because
      // nothing on screen would say a row was missing.
      if (parsed === null) throw new ResponseShapeError(what);
      return parsed;
    });
  };
}

const parseWatchlistItems = listOf(toWatchlistItem, "watchlist");
const parseCandles = listOf(toCandle, "price history");
const parsePriceAlerts = listOf(toPriceAlert, "alert list");

export function parseWatchlistResponse(raw: unknown): { items: WatchlistItem[] } {
  if (!isRecord(raw)) throw new ResponseShapeError("watchlist");
  return { items: parseWatchlistItems(raw.items) };
}

export function parseWatchlistItemResponse(raw: unknown): { item: WatchlistItem } {
  if (!isRecord(raw)) throw new ResponseShapeError("watchlist entry");
  const item = toWatchlistItem(raw.item);
  if (item === null) throw new ResponseShapeError("watchlist entry");
  return { item };
}

export function parseHistoryResponse(raw: unknown): { candles: Candle[]; source: string } {
  if (!isRecord(raw)) throw new ResponseShapeError("price history");
  return {
    candles: parseCandles(raw.candles),
    source: typeof raw.source === "string" ? raw.source : "unknown",
  };
}

export function parseAlertsResponse(raw: unknown): { alerts: PriceAlert[] } {
  if (!isRecord(raw)) throw new ResponseShapeError("alert list");
  return { alerts: parsePriceAlerts(raw.alerts) };
}

export function parseAlertResponse(raw: unknown): { alert: PriceAlert } {
  if (!isRecord(raw)) throw new ResponseShapeError("alert");
  const alert = toPriceAlert(raw.alert);
  if (alert === null) throw new ResponseShapeError("alert");
  return { alert };
}
