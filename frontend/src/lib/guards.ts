// Shared primitive type guards.
//
// These lived inside wsMessages.ts, which was fine while the WebSocket was the
// only place we validated. Adding the same checks for REST responses would
// have meant a second copy, and two definitions of "is this a usable number"
// drift — one of them starts allowing NaN and nobody notices until a render
// prints "$NaN".

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Rejects NaN and Infinity as well as non-numbers: a NaN price renders as
// "$NaN" and an Infinite one breaks every chart axis it touches.
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** For fields the backend models as nullable — absent is wrong, null isn't. */
export function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

export function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}
