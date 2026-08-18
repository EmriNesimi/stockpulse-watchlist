import { afterAll, afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../db";

const app = createApp();

afterEach(async () => {
  await prisma.watchlistItem.deleteMany();
  await prisma.watchlist.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/auth/signup", () => {
  it("creates a new account, an empty watchlist, and sets a session cookie", async () => {
    const res = await request(app).post("/api/auth/signup").send({ email: "new@example.com", password: "hunter22" });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: "new@example.com" });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers["set-cookie"]?.[0]).toContain("stockpulse_session=");

    const watchlist = await prisma.watchlist.findUnique({ where: { userId: res.body.user.id } });
    expect(watchlist).not.toBeNull();
  });

  it("lowercases the email", async () => {
    const res = await request(app).post("/api/auth/signup").send({ email: "Mixed@Example.com", password: "hunter22" });
    expect(res.body.user.email).toBe("mixed@example.com");
  });

  it("rejects a duplicate email with 409", async () => {
    await request(app).post("/api/auth/signup").send({ email: "dupe@example.com", password: "hunter22" });
    const res = await request(app).post("/api/auth/signup").send({ email: "dupe@example.com", password: "different1" });

    expect(res.status).toBe(409);
  });

  it("rejects a short password", async () => {
    const res = await request(app).post("/api/auth/signup").send({ email: "short@example.com", password: "short" });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid email", async () => {
    const res = await request(app).post("/api/auth/signup").send({ email: "not-an-email", password: "hunter22" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with the correct credentials and sets a session cookie", async () => {
    await request(app).post("/api/auth/signup").send({ email: "login@example.com", password: "correct-password" });

    const res = await request(app).post("/api/auth/login").send({ email: "login@example.com", password: "correct-password" });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: "login@example.com" });
    expect(res.headers["set-cookie"]?.[0]).toContain("stockpulse_session=");
  });

  it("rejects a wrong password with 401", async () => {
    await request(app).post("/api/auth/signup").send({ email: "login2@example.com", password: "correct-password" });

    const res = await request(app).post("/api/auth/login").send({ email: "login2@example.com", password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("rejects an unknown email with 401 (same error as a wrong password)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: "anything12" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the session cookie", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(204);
    expect(res.headers["set-cookie"]?.[0]).toMatch(/stockpulse_session=;/);
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 when there's no session cookie", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the signed-in user when the session cookie is valid", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/signup").send({ email: "me@example.com", password: "hunter22" });

    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: "me@example.com" });
  });

  it("returns 401 for a tampered session cookie", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", "stockpulse_session=fake.notarealsignature");
    expect(res.status).toBe(401);
  });

  it("reports emailVerified: false right after signup", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/signup").send({ email: "unverified@example.com", password: "hunter22" });

    const res = await agent.get("/api/auth/me");
    expect(res.body.user.emailVerified).toBe(false);
  });
});

describe("POST /api/auth/verify-email", () => {
  it("verifies the account with a valid token and clears it (single-use)", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/signup").send({ email: "verifyme@example.com", password: "hunter22" });
    const stored = await prisma.user.findUniqueOrThrow({ where: { email: "verifyme@example.com" } });

    const res = await request(app).post("/api/auth/verify-email").send({ token: stored.verificationToken });
    expect(res.status).toBe(200);
    expect(res.body.user.emailVerified).toBe(true);

    const meRes = await agent.get("/api/auth/me");
    expect(meRes.body.user.emailVerified).toBe(true);

    // Using the same token again fails - it was cleared on first use.
    const reuse = await request(app).post("/api/auth/verify-email").send({ token: stored.verificationToken });
    expect(reuse.status).toBe(400);
  });

  it("rejects a garbage token", async () => {
    const res = await request(app).post("/api/auth/verify-email").send({ token: "not-a-real-token" });
    expect(res.status).toBe(400);
  });

  it("rejects a missing token", async () => {
    const res = await request(app).post("/api/auth/verify-email").send({});
    expect(res.status).toBe(400);
  });

  it("rejects an expired token", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/signup").send({ email: "expired@example.com", password: "hunter22" });
    const stored = await prisma.user.findUniqueOrThrow({ where: { email: "expired@example.com" } });
    await prisma.user.update({
      where: { id: stored.id },
      data: { verificationTokenExpires: new Date(Date.now() - 1000) },
    });

    const res = await request(app).post("/api/auth/verify-email").send({ token: stored.verificationToken });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/resend-verification", () => {
  it("returns 401 without a session", async () => {
    const res = await request(app).post("/api/auth/resend-verification");
    expect(res.status).toBe(401);
  });

  it("issues a fresh token for an unverified user", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/signup").send({ email: "resend@example.com", password: "hunter22" });
    const before = await prisma.user.findUniqueOrThrow({ where: { email: "resend@example.com" } });

    const res = await agent.post("/api/auth/resend-verification");
    expect(res.status).toBe(204);

    const after = await prisma.user.findUniqueOrThrow({ where: { email: "resend@example.com" } });
    expect(after.verificationToken).not.toBe(before.verificationToken);
  });

  it("returns 409 if the email is already verified", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/signup").send({ email: "already-verified@example.com", password: "hunter22" });
    const stored = await prisma.user.findUniqueOrThrow({ where: { email: "already-verified@example.com" } });
    await request(app).post("/api/auth/verify-email").send({ token: stored.verificationToken });

    const res = await agent.post("/api/auth/resend-verification");
    expect(res.status).toBe(409);
  });
});
