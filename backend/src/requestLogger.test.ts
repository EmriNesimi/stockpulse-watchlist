import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { logger } from "./logger";
import { requestLogger } from "./requestLogger";

function appWith(handler: express.RequestHandler, path = "/thing") {
  const app = express();
  app.use(requestLogger);
  app.get(path, handler);
  return app;
}

describe("requestLogger", () => {
  it("logs a completed request with method, path, status and duration", async () => {
    const info = vi.spyOn(logger, "info").mockImplementation(() => {});
    await request(appWith((_req, res) => void res.json({ ok: true }))).get("/thing");

    expect(info).toHaveBeenCalledWith(
      "request",
      expect.objectContaining({ method: "GET", path: "/thing", status: 200 })
    );
    expect(info.mock.calls[0]?.[1]?.durationMs).toBeTypeOf("number");
    info.mockRestore();
  });

  // A 401 or 404 never reaches the error handler, so these were invisible
  // before — and they're the ones you look for when something is wrong.
  it("logs a rejected request as a warning", async () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
    await request(appWith((_req, res) => void res.status(401).json({ error: "no" }))).get("/thing");

    expect(warn).toHaveBeenCalledWith("request rejected", expect.objectContaining({ status: 401 }));
    warn.mockRestore();
  });

  it("logs a server error as an error", async () => {
    const error = vi.spyOn(logger, "error").mockImplementation(() => {});
    await request(appWith((_req, res) => void res.status(500).json({ error: "boom" }))).get("/thing");

    expect(error).toHaveBeenCalledWith("request failed", expect.objectContaining({ status: 500 }));
    error.mockRestore();
  });

  // Render's health check plus the daily smoke run would otherwise be most of
  // the log by volume.
  it("stays quiet about a healthy /health", async () => {
    const info = vi.spyOn(logger, "info").mockImplementation(() => {});
    await request(appWith((_req, res) => void res.json({ ok: true }), "/health")).get("/health");

    expect(info).not.toHaveBeenCalled();
    info.mockRestore();
  });

  it("still reports an unhealthy /health", async () => {
    const error = vi.spyOn(logger, "error").mockImplementation(() => {});
    await request(appWith((_req, res) => void res.status(503).json({ e: 1 }), "/health")).get("/health");

    expect(error).toHaveBeenCalledWith("request failed", expect.objectContaining({ status: 503 }));
    error.mockRestore();
  });
});

describe("requestLogger — the path field", () => {
  // Express rewrites req.path relative to a router's mount point, so reading
  // it in the finish handler logged "/" for every mounted route — the one
  // field you'd be reading the log for.
  it("logs the full path even for a route inside a mounted router", async () => {
    const info = vi.spyOn(logger, "info").mockImplementation(() => {});

    const router = express.Router();
    router.get("/watchlist", (_req, res) => void res.json({ items: [] }));
    const app = express();
    app.use(requestLogger);
    app.use("/api", router);

    await request(app).get("/api/watchlist");

    expect(info).toHaveBeenCalledWith("request", expect.objectContaining({ path: "/api/watchlist" }));
    info.mockRestore();
  });

  // Search terms are the user's, and they add nothing to a request log.
  it("drops the query string", async () => {
    const info = vi.spyOn(logger, "info").mockImplementation(() => {});
    await request(appWith((_req, res) => void res.json({ ok: true }), "/search")).get("/search?q=AAPL");

    expect(info).toHaveBeenCalledWith("request", expect.objectContaining({ path: "/search" }));
    info.mockRestore();
  });
});
