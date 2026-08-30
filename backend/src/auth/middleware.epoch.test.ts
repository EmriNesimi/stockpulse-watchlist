import { afterAll, afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../db";
import { SESSION_COOKIE_NAME, createSessionCookieValue } from "./session";

const app = createApp();
const CREDENTIALS = { email: "epoch@example.com", password: "hunter22" };

afterEach(async () => {
  await prisma.watchlistItem.deleteMany();
  await prisma.watchlist.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function signedInUser() {
  await request(app).post("/api/auth/signup").send(CREDENTIALS);
  const res = await request(app).post("/api/auth/login").send(CREDENTIALS);
  const setCookie = res.headers["set-cookie"];
  const cookie = (Array.isArray(setCookie) ? setCookie[0] : String(setCookie)).split(";")[0];
  const user = await prisma.user.findUniqueOrThrow({ where: { email: CREDENTIALS.email } });
  return { cookie, user };
}

describe("session epoch enforcement", () => {
  it("accepts a cookie issued at the current epoch", async () => {
    const { cookie } = await signedInUser();

    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(200);
  });

  // The reason the epoch exists. Bumping it has to invalidate a cookie the
  // holder still physically possesses — that's what "sign out everywhere"
  // means, and what a stateless cookie could never do.
  it("rejects a cookie issued before the epoch was bumped", async () => {
    const { cookie, user } = await signedInUser();

    await prisma.user.update({ where: { id: user.id }, data: { sessionEpoch: { increment: 1 } } });

    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(401);
  });

  // A forged epoch must not verify — the signature covers it.
  it("rejects a cookie whose epoch was hand-raised to match", async () => {
    const { user } = await signedInUser();
    await prisma.user.update({ where: { id: user.id }, data: { sessionEpoch: 5 } });

    // Signed at 5 but with the wrong secret? No — signed correctly at 5 is
    // legitimate. What must fail is editing an old cookie's epoch text.
    const honest = createSessionCookieValue(user.id, 5);
    const tampered = honest.replace(`${user.id}.5.`, `${user.id}.6.`);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `${SESSION_COOKIE_NAME}=${tampered}`);
    expect(res.status).toBe(401);
  });

  it("treats a deleted user as signed out rather than erroring", async () => {
    const { cookie, user } = await signedInUser();
    await prisma.watchlistItem.deleteMany();
    await prisma.watchlist.deleteMany();
    await prisma.user.delete({ where: { id: user.id } });

    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(401);
  });
});
