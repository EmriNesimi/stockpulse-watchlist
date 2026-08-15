import { z } from "zod";
import { symbolSchema } from "./watchlist.schemas";

// $10M/share is comfortably above anything real (Berkshire's A shares, the
// highest-priced stock that actually trades, sit well under $1M) - this is
// just a sanity ceiling so a typo or a garbage value like 1e300 doesn't get
// stored as a threshold that can never plausibly trigger.
const MAX_THRESHOLD = 10_000_000;

export const createAlertSchema = z.object({
  symbol: symbolSchema,
  threshold: z.number().positive().finite().max(MAX_THRESHOLD),
  direction: z.enum(["above", "below"]),
});

// Prisma's cuid() ids are 25 lowercase alphanumeric chars starting with
// "c" - not pinned to that exact shape (Prisma's id generation is an
// implementation detail that could change), just a generous bound so
// something absurdly long or containing unexpected characters 400s here
// instead of reaching the database as a query param.
export const alertIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-zA-Z0-9]+$/, "Invalid alert id");
