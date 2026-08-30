import { afterAll, afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../db";
import { resetEmailQuota } from "../email/sendThrottle";

const app = createApp();
const EMAIL = "resetme@example.com";
const OLD_PASSWORD = "hunter22";
const NEW_PASSWORD = "correct-horse-battery";

afterEach(async () => {
  resetEmailQuota();
  await prisma.watchlistItem.deleteMany();
  await prisma.watchlist.deleteMany();
  await prisma.user.deleteMany();
});

// Every other db-touching test file closes its pool; these three didn't, which
// left the run relying on worker teardown to do it.
afterAll(async () => {
  await prisma.$disconnect();
});

async function signUp(email = EMAIL) {
  await request(app).post("/api/auth/signup").send({ email, password: OLD_PASSWORD });
  resetEmailQuota(); // signup spent this address's send slot
}

async function requestReset(email = EMAIL) {
  const res = await request(app).post("/api/auth/forgot-password").send({ email });
  expect(res.status).toBe(202);
  const user = await prisma.user.findUnique({ where: { email } });
  return user?.resetToken ?? null;
}

describe("POST /api/auth/forgot-password", () => {
  it("issues a token for a real account", async () => {
    await signUp();
    expect(await requestReset()).toMatch(/^[a-f0-9]{64}$/);
  });

  // The whole reason this answers 202 unconditionally. An unauthenticated
  // caller must not be able to use it to test which addresses are registered.
  it("answers identically for an address with no account", async () => {
    const known = await request(app).post("/api/auth/forgot-password").send({ email: EMAIL });
    await signUp();
    const unknown = await request(app).post("/api/auth/forgot-password").send({ email: "nobody@example.com" });

    expect(unknown.status).toBe(known.status);
    expect(unknown.body).toEqual(known.body);
    expect(await prisma.user.findUnique({ where: { email: "nobody@example.com" } })).toBeNull();
  });
});

describe("POST /api/auth/reset-password", () => {
  it("sets the new password and lets you log in with it", async () => {
    await signUp();
    const token = await requestReset();

    const reset = await request(app).post("/api/auth/reset-password").send({ token, password: NEW_PASSWORD });
    expect(reset.status).toBe(204);

    const withNew = await request(app).post("/api/auth/login").send({ email: EMAIL, password: NEW_PASSWORD });
    expect(withNew.status).toBe(200);
  });

  it("stops the old password working", async () => {
    await signUp();
    const token = await requestReset();
    await request(app).post("/api/auth/reset-password").send({ token, password: NEW_PASSWORD });

    const withOld = await request(app).post("/api/auth/login").send({ email: EMAIL, password: OLD_PASSWORD });
    expect(withOld.status).toBe(401);
  });

  it("burns the token — a second use fails", async () => {
    await signUp();
    const token = await requestReset();
    await request(app).post("/api/auth/reset-password").send({ token, password: NEW_PASSWORD });

    const replay = await request(app).post("/api/auth/reset-password").send({ token, password: "another-password" });
    expect(replay.status).toBe(400);
  });

  it("refuses an expired token", async () => {
    await signUp();
    const token = await requestReset();
    await prisma.user.update({
      where: { email: EMAIL },
      data: { resetTokenExpires: new Date(Date.now() - 1000) },
    });

    const res = await request(app).post("/api/auth/reset-password").send({ token, password: NEW_PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or has expired/i);
  });

  // An unknown token and an expired one must look the same from outside.
  it("gives the same answer for a token that never existed", async () => {
    const res = await request(app).post("/api/auth/reset-password").send({ token: "a".repeat(64), password: NEW_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or has expired/i);
  });

  it("holds the reset password to the same rules as signup", async () => {
    await signUp();
    const token = await requestReset();

    const res = await request(app).post("/api/auth/reset-password").send({ token, password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 8 characters/i);
  });

  it("does not sign you in", async () => {
    await signUp();
    const token = await requestReset();

    const res = await request(app).post("/api/auth/reset-password").send({ token, password: NEW_PASSWORD });
    expect(res.headers["set-cookie"]).toBeUndefined();
  });
});

describe("resetting a password signs out other devices", () => {
  // The gap this whole change exists to close: a reset used to leave every
  // session opened with the old password still working.
  it("invalidates a session opened before the reset", async () => {
    await signUp();

    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: EMAIL, password: OLD_PASSWORD });
    expect((await agent.get("/api/auth/me")).status).toBe(200);

    const token = await requestReset();
    await request(app).post("/api/auth/reset-password").send({ token, password: NEW_PASSWORD });

    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });

  it("still lets the user log in again afterwards", async () => {
    await signUp();
    const token = await requestReset();
    await request(app).post("/api/auth/reset-password").send({ token, password: NEW_PASSWORD });

    const fresh = request.agent(app);
    await fresh.post("/api/auth/login").send({ email: EMAIL, password: NEW_PASSWORD });

    expect((await fresh.get("/api/auth/me")).status).toBe(200);
  });
});
