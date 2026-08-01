import { z } from "zod";

// "default-user" until there's ever a real login. Ticker symbols like
// BRK.B and BF-B exist, so allow dots/dashes but keep it tight otherwise.
export const symbolSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{1,6}([.-][A-Z]{1,2})?$/, "Not a valid ticker symbol");

export const addItemSchema = z.object({
  symbol: symbolSchema,
  name: z.string().trim().max(200).optional(),
});
