import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./env";
import { attachUserId } from "./auth/middleware";
import authRouter from "./routes/auth";
import watchlistRouter from "./routes/watchlist";
import searchRouter from "./routes/search";
import alertsRouter from "./routes/alerts";
import historyRouter from "./routes/history";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.frontendOrigin,
      methods: ["GET", "POST", "DELETE"],
      credentials: true, // session cookie needs to cross the cors boundary
    })
  );
  app.use(express.json({ limit: "10kb" })); // watchlist payloads are tiny, no reason to allow more
  app.use(cookieParser());
  app.use(attachUserId);

  // Generous but real limits — this is a portfolio project, not a public API,
  // but the search/watchlist routes still shouldn't be hammerable.
  const apiLimiter = rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api", apiLimiter);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/watchlist", watchlistRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/alerts", alertsRouter);
  app.use("/api/history", historyRouter);

  // Keep error details out of responses — log server-side, send something generic.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  });

  return app;
}
