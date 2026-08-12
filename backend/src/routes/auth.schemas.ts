import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Not a valid email address").max(254),
  // Just a length floor, not a complexity rule — those tend to push users
  // toward "Password1!" over a genuinely long passphrase.
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});
