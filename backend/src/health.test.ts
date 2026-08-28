import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "./app";
import { prisma } from "./db";

const app = createApp();

afterEach(() => vi.restoreAllMocks());

describe("GET /health", () => {
  it("reports ok when the database answers", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", database: "ok" });
  });

  // The point of the endpoint: Render routes traffic based on it, so an
  // instance that can't reach Postgres must not claim to be healthy.
  it("reports 503 when the database is unreachable", async () => {
    vi.spyOn(prisma, "$queryRaw").mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const res = await request(app).get("/health");

    expect(res.status).toBe(503);
    expect(res.body.status).toBe("unavailable");
  });

  // Connection errors carry hostnames and credentials, and this endpoint is
  // public and unauthenticated.
  it("does not leak the underlying error", async () => {
    vi.spyOn(prisma, "$queryRaw").mockRejectedValueOnce(
      new Error("connection to server at db.internal (10.0.0.5), user stockpulse_admin failed")
    );

    const res = await request(app).get("/health");

    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/db\.internal|10\.0\.0\.5|stockpulse_admin/);
  });
});
