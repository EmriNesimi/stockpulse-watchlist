import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app";
import { env } from "./env";

const app = createApp();

// The browser sends a preflight before any PATCH, so a method missing from
// the CORS allow-list fails in the browser while still passing every
// server-side route test. Pinning the list here so adding a route with a new
// verb can't quietly ship broken.
describe("CORS preflight", () => {
  for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
    it(`allows ${method} from the frontend origin`, async () => {
      const res = await request(app)
        .options("/api/watchlist/AAPL")
        .set("Origin", env.frontendOrigin)
        .set("Access-Control-Request-Method", method);

      expect(res.headers["access-control-allow-methods"]).toContain(method);
      expect(res.headers["access-control-allow-origin"]).toBe(env.frontendOrigin);
    });
  }

  it("sends credentials support so the session cookie crosses the origin", async () => {
    const res = await request(app)
      .options("/api/watchlist")
      .set("Origin", env.frontendOrigin)
      .set("Access-Control-Request-Method", "GET");

    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("doesn't echo an allow-origin for a foreign origin", async () => {
    const res = await request(app)
      .options("/api/watchlist")
      .set("Origin", "https://evil.example.com")
      .set("Access-Control-Request-Method", "GET");

    expect(res.headers["access-control-allow-origin"]).not.toBe("https://evil.example.com");
  });
});
