import { z } from "zod";

// Ticker symbols like BRK.B and BF-B exist, so allow dots/dashes but keep
// it tight otherwise.
export const symbolSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{1,6}([.-][A-Z]{1,2})?$/, "Not a valid ticker symbol");

export const addItemSchema = z.object({
  symbol: symbolSchema,
  // .optional() alone still lets "" or "   " through - min(1) after trim
  // rejects those while still letting the field be omitted entirely.
  name: z.string().trim().min(1).max(200).optional(),
});
