import { z } from "zod";

export const historyQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(365).optional().default(30),
});
