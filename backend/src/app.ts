import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./env";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.frontendOrigin,
      methods: ["GET", "POST", "DELETE"],
    })
  );
  app.use(express.json({ limit: "10kb" })); // watchlist payloads are tiny, no reason to allow more

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

  return app;
}
