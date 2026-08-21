import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

// Same reason as env.test.ts: env.ts imports dotenv/config, which re-reads
// backend/.env on every re-import and would fight the stubs below.
vi.mock("dotenv/config", () => ({}));

const CREDENTIALS = { email: "cookie@example.com", password: "hunter22" };

// The cookie attributes are decided once at module load from FRONTEND_ORIGIN,
// so each case needs a fresh module registry rather than just a new app.
async function sessionCookieFor(frontendOrigin: string): Promise<string> {
  vi.stubEnv("FRONTEND_ORIGIN", frontendOrigin);
  vi.resetModules();

  const { createApp } = await import("../app");
  const { prisma } = await import("../db");
  const app = createApp();

  try {
    await request(app).post("/api/auth/signup").send(CREDENTIALS);
    const res = await request(app).post("/api/auth/login").send(CREDENTIALS);
    expect(res.status).toBe(200);

    const setCookie = res.headers["set-cookie"];
    return Array.isArray(setCookie) ? setCookie[0] : String(setCookie);
  } finally {
    await prisma.watchlistItem.deleteMany();
    await prisma.watchlist.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("session cookie SameSite", () => {
  // Regression: the deployed frontend and API are separate onrender.com
  // subdomains, and onrender.com is on the Public Suffix List — so they are
  // cross-site. Under SameSite=Lax the browser stored the cookie at login and
  // then never sent it again, and every following request looked signed out.
  it("is None+Secure when the frontend is a cross-site https origin", async () => {
    const cookie = await sessionCookieFor("https://stockpulse-b449.onrender.com");

    expect(cookie).toMatch(/SameSite=None/i);
    expect(cookie).toMatch(/Secure/i);
  });

  // Locally both ends are localhost, which is same-site. Secure there would
  // stop the cookie working over plain http.
  it("stays Lax and insecure for a local http frontend", async () => {
    const cookie = await sessionCookieFor("http://localhost:5173");

    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).not.toMatch(/Secure/i);
  });
});
