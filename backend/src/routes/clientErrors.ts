import { Router } from "express";
import { asyncHandler } from "../asyncHandler";
import { logger } from "../logger";
import { clientErrorSchema } from "./clientErrors.schemas";

const router = Router();

/**
 * Where a crash in someone's browser goes.
 *
 * Without this a render error reached the user's own devtools and nowhere
 * else — the screen they saw was the only evidence it happened, and only they
 * saw it. This puts it in the same log stream as everything else.
 *
 * Deliberately unauthenticated: the errors most worth hearing about are the
 * ones that break the app before or during sign-in. It sits under /api, so the
 * 60/min limiter applies, and every field is length-capped.
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = clientErrorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" });
    }

    // Reported rather than thrown: this describes something that already
    // happened elsewhere, and the fields are JSON-encoded by the logger, so
    // hostile content can't break out of the line it's written on.
    logger.error("client error", { ...parsed.data, reported: true });

    // Nothing useful to say back, and the client is already broken.
    res.status(204).send();
  })
);

export default router;
