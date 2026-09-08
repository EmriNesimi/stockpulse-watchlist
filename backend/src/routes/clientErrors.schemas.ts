import { z } from "zod";

// Every field is length-capped. This endpoint is public and takes whatever a
// browser sends, so the caps are what stop a stack trace — or something
// pretending to be one — from filling the log stream. express.json already
// caps the body at 10kb; this bounds each field within that.
export const clientErrorSchema = z.object({
  message: z.string().trim().min(1).max(500),
  stack: z.string().trim().max(4000).optional(),
  componentStack: z.string().trim().max(4000).optional(),
  // Where it happened. Sent by the client rather than read from the Referer
  // header, because a SPA's route lives in the URL the client knows about.
  url: z.string().trim().max(500).optional(),
});
