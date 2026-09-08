import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { logger } from "../logger";

const app = createApp();

describe("POST /api/client-errors", () => {
  it("records what the browser reported", async () => {
    const error = vi.spyOn(logger, "error").mockImplementation(() => {});

    const res = await request(app).post("/api/client-errors").send({
      message: "Cannot read properties of undefined (reading 'price')",
      stack: "at WatchlistRow (WatchlistRow.tsx:41)",
      url: "/dashboard",
    });

    expect(res.status).toBe(204);
    expect(error).toHaveBeenCalledWith(
      "client error",
      expect.objectContaining({ message: expect.stringContaining("Cannot read properties"), url: "/dashboard" })
    );
    error.mockRestore();
  });

  // Unauthenticated on purpose: the errors most worth hearing about are the
  // ones that break the app before anyone can sign in.
  it("accepts a report from a signed-out browser", async () => {
    const error = vi.spyOn(logger, "error").mockImplementation(() => {});
    const res = await request(app).post("/api/client-errors").send({ message: "boom" });

    expect(res.status).toBe(204);
    error.mockRestore();
  });

  it("rejects a body with no message", async () => {
    expect((await request(app).post("/api/client-errors").send({ stack: "..." })).status).toBe(400);
  });

  it("rejects an empty message rather than logging a blank line", async () => {
    expect((await request(app).post("/api/client-errors").send({ message: "   " })).status).toBe(400);
  });

  // The endpoint is public, so the caps are what stop it filling the log
  // stream with whatever someone feels like posting.
  it("rejects an oversized stack", async () => {
    const res = await request(app)
      .post("/api/client-errors")
      .send({ message: "boom", stack: "x".repeat(5000) });

    expect(res.status).toBe(400);
  });

  // The logger JSON-encodes its fields, so a message full of quotes and
  // newlines can't break out of the line it's written on.
  it("cannot inject a second log line", async () => {
    const error = vi.spyOn(logger, "error").mockImplementation(() => {});
    await request(app)
      .post("/api/client-errors")
      .send({ message: '","level":"info","message":"totally fine' });

    const [, fields] = error.mock.calls[0] ?? [];
    expect(JSON.stringify(fields)).toContain("totally fine");
    expect((fields as { message: string }).message).toContain('"level"');
    error.mockRestore();
  });
});
