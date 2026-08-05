import { z } from "zod";
import { symbolSchema } from "./watchlist.schemas";

export const createAlertSchema = z.object({
  symbol: symbolSchema,
  threshold: z.number().positive().finite(),
  direction: z.enum(["above", "below"]),
});

export const alertIdSchema = z.string().trim().min(1);
