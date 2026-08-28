import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./env";
import { prisma } from "./db";
import { attachUserId, requireAuth } from "./auth/middleware";
import authRouter from "./routes/auth";
import watchlistRouter from "./routes/watchlist";
import searchRouter from "./routes/search";
import alertsRouter from "./routes/alerts";
import historyRouter from "./routes/history";

export function createApp() {
  const app = express();

  // Both rate limiters below bucket by client IP. Behind a reverse proxy
  // (Render, Fly, nginx) every request arrives from the proxy's address, so
  // without this the whole userbase shares one login budget and a single
  // attacker locks everyone out. Trusting exactly one hop rather than `true`
  // - blanket trust lets a client spoof its own IP via X-Forwarded-For and
  // sidestep the limiter entirely.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.frontendOrigin,
      methods: ["GET", "POST", "PATCH", "DELETE"],
      credentials: true, // session cookie needs to cross the cors boundary
    })
  );
  app.use(express.json({ limit: "10kb" })); // watchlist payloads are tiny, no reason to allow more
  app.use(cookieParser());
  app.use(attachUserId);

  // Generous but real limits — this is a portfolio project, not a public API,
  // but the search/watchlist routes still shouldn't be hammerable. Skipped
  // under test for the same reason as authLimiter below: route test files
  // share one app instance across well more than 60 requests for reasons
  // that have nothing to do with rate limiting (e.g. the watchlist-cap test
  // alone makes 31 requests).
  const apiLimiter = rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
  });
  app.use("/api", apiLimiter);

  // Login/signup need a much tighter cap than the general API limit - 60
  // attempts/min against a login endpoint is a brute-force budget, not a
  // real usage pattern. Stacks with apiLimiter above; this is just the
  // stricter of the two on this specific path. Skipped under test - the
  // route test files each share one app instance across a dozen-plus
  // requests well past this limit, which has nothing to do with what those
  // tests are actually checking (see auth.ratelimit.test.ts for a test
  // that exercises this limiter directly, with NODE_ENV overridden).
  const authLimiter = rateLimit({
    windowMs: 60_000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
  });
  app.use("/api/auth", authLimiter);

  // Render decides whether an instance is live from this, and routes traffic
  // accordingly. Answering ok without checking anything meant an instance that
  // couldn't reach Postgres still reported healthy and kept taking requests
  // that were all going to 500 — the deploy would look successful while every
  // page was broken.
  app.get("/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      // Deliberately no detail: this endpoint is public, and connection errors
      // carry hostnames and usernames.
      return res.status(503).json({ status: "unavailable", database: "unreachable" });
    }

    res.json({ status: "ok", database: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/watchlist", requireAuth, watchlistRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/alerts", requireAuth, alertsRouter);
  app.use("/api/history", historyRouter);

  // Keep error details out of responses — log server-side, send something generic.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  });

  return app;
}
