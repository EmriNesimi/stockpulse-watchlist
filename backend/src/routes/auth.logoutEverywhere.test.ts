import { afterAll, afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../db";

const app = createApp();
const CREDENTIALS = { email: "everywhere@example.com", password: "hunter22" };

afterEach(async () => {
  await prisma.watchlistItem.deleteMany();
  await prisma.watchlist.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function signedIn() {
  const agent = request.agent(app);
  await agent.post("/api/auth/signup").send(CREDENTIALS);
  await agent.post("/api/auth/login").send(CREDENTIALS);
  return agent;
}

describe("POST /api/auth/logout-everywhere", () => {
  it("requires a session", async () => {
    expect((await request(app).post("/api/auth/logout-everywhere")).status).toBe(401);
  });

  // The point: a session on another device, which this request never touches.
  it("kills a session opened on another device", async () => {
    const laptop = await signedIn();
    const phone = request.agent(app);
    await phone.post("/api/auth/login").send(CREDENTIALS);

    expect((await phone.get("/api/auth/me")).status).toBe(200);
    expect((await laptop.post("/api/auth/logout-everywhere")).status).toBe(204);

    expect((await phone.get("/api/auth/me")).status).toBe(401);
  });

  it("signs out the caller too rather than leaving a dead cookie", async () => {
    const agent = await signedIn();
    await agent.post("/api/auth/logout-everywhere");

    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });

  it("lets you log back in afterwards", async () => {
    const agent = await signedIn();
    await agent.post("/api/auth/logout-everywhere");

    const fresh = request.agent(app);
    await fresh.post("/api/auth/login").send(CREDENTIALS);
    expect((await fresh.get("/api/auth/me")).status).toBe(200);
  });
});
