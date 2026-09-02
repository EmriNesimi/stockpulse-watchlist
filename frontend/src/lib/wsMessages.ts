// Runtime validation for everything the WebSocket sends us.
//
// The client→server direction is already validated server-side with zod. This
// is the other half: `JSON.parse` returns `any`, and assigning that straight
// into a typed variable is an unchecked cast. If the server ever sent a tick
// whose `price` was a string, nothing would notice until `price.toFixed(2)`
// threw inside a render and took the screen down.
//
// Hand-rolled rather than pulling zod into the frontend bundle for three small

import { isFiniteNumber, isNonEmptyString, isRecord } from "./guards";

export interface TickMessage {
  type: "tick";
  symbol: string;
  price: number;
  changePercent: number;
  source: "live" | "simulated";
}

export interface AlertEvent {
  id: string;
  symbol: string;
  threshold: number;
  direction: "above" | "below";
  price: number;
  triggeredAt: string;
}

export interface AlertMessage extends AlertEvent {
  type: "alert";
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export type ServerMessage = TickMessage | AlertMessage | ErrorMessage;

// "NaN" rather than failing loudly, which is worse than dropping the frame.
function toTick(m: Record<string, unknown>): TickMessage | null {
  if (!isNonEmptyString(m.symbol)) return null;
  if (!isFiniteNumber(m.price)) return null;
  if (!isFiniteNumber(m.changePercent)) return null;
  if (m.source !== "live" && m.source !== "simulated") return null;
  return {
    type: "tick",
    symbol: m.symbol,
    price: m.price,
    changePercent: m.changePercent,
    source: m.source,
  };
}

function toAlert(m: Record<string, unknown>): AlertMessage | null {
  if (!isNonEmptyString(m.id)) return null;
  if (!isNonEmptyString(m.symbol)) return null;
  if (!isFiniteNumber(m.threshold)) return null;
  if (m.direction !== "above" && m.direction !== "below") return null;
  if (!isFiniteNumber(m.price)) return null;
  if (!isNonEmptyString(m.triggeredAt)) return null;
  return {
    type: "alert",
    id: m.id,
    symbol: m.symbol,
    threshold: m.threshold,
    direction: m.direction,
    price: m.price,
    triggeredAt: m.triggeredAt,
  };
}

/**
 * Parses a raw WebSocket frame. Returns null for anything malformed or
 * unrecognised, so the caller drops the frame instead of trusting it.
 */
export function parseServerMessage(raw: unknown): ServerMessage | null {
  if (typeof raw !== "string") return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;

  switch (parsed.type) {
    case "tick":
      return toTick(parsed);
    case "alert":
      return toAlert(parsed);
    case "error":
      return isNonEmptyString(parsed.message) ? { type: "error", message: parsed.message } : null;
    default:
      return null;
  }
}
