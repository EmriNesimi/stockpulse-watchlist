import { z } from "zod";

// Ticker symbols like BRK.B and BF-B exist, so allow dots/dashes but keep
// it tight otherwise.
export const symbolSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{1,6}([.-][A-Z]{1,2})?$/, "Not a valid ticker symbol");

// Same $10M-ish sanity ceiling as AlertForm/alerts.schemas.ts - comfortably
// above any real share price, just a guard against a typo or garbage value.
const MAX_COST_BASIS = 10_000_000;
const MAX_SHARES = 1_000_000_000;

const sharesSchema = z.number().positive().finite().max(MAX_SHARES);
const costBasisSchema = z.number().positive().finite().max(MAX_COST_BASIS);

export const addItemSchema = z
  .object({
    symbol: symbolSchema,
    // .optional() alone still lets "" or "   " through - min(1) after trim
    // rejects those while still letting the field be omitted entirely.
    name: z.string().trim().min(1).max(200).optional(),
    shares: sharesSchema.optional(),
    costBasis: costBasisSchema.optional(),
  })
  .refine((data) => (data.shares === undefined) === (data.costBasis === undefined), {
    error: "shares and costBasis must be provided together, or not at all",
    path: ["shares"],
  });

// PATCH /api/watchlist/:symbol - set, update, or clear holdings on an
// item that's already on the watchlist. Clearing sends both as null
// explicitly, rather than omitting them, so "no holdings" is unambiguous.
export const updateHoldingsSchema = z
  .object({
    shares: sharesSchema.nullable(),
    costBasis: costBasisSchema.nullable(),
  })
  .refine((data) => (data.shares === null) === (data.costBasis === null), {
    error: "shares and costBasis must both be set or both be null",
    path: ["shares"],
  });
