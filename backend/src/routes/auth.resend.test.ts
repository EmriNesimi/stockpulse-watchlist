import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../db";
import { resetEmailQuota } from "../email/sendThrottle";

// The real sendEmail no-ops under NODE_ENV=test, so the failure branch is
// unreachable without forcing it. Resend really does reject like this: it
// 403s any recipient other than the account owner until a domain is verified.
vi.mock("../email/resend", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../email/resend.js")>()),
  sendEmail: vi.fn(async () => {
    throw new Error("Resend API request failed with status 403");
  }),
}));

const app = createApp();
const CREDENTIALS = { email: "bounces@example.com", password: "hunter22" };

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

describe("POST /api/auth/resend-verification when the send fails", () => {
  // Regression: this used to answer 204 regardless, so the UI reported
  // success and the user waited for mail that was never accepted.
  it("reports the failure instead of claiming success", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/signup").send(CREDENTIALS);
    await agent.post("/api/auth/login").send(CREDENTIALS);

    // Signup already spent this address's send slot; a real user clicking
    // resend does so after the cooldown, so clear it rather than assert on
    // the throttled path here.
    resetEmailQuota();

    const res = await agent.post("/api/auth/resend-verification");

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/couldn't send/i);
  });

  // Signup must stay indistinguishable between "new address" and "already
  // registered", so it still absorbs the same failure.
  it("still lets signup answer 202 with the same failure", async () => {
    const res = await request(app).post("/api/auth/signup").send(CREDENTIALS);

    expect(res.status).toBe(202);
    expect(await prisma.user.findUnique({ where: { email: CREDENTIALS.email } })).not.toBeNull();
  });
});

describe("signup when the verification token can't be issued", () => {
  // The user row is committed before this runs, so an error here used to
  // surface as a 500 for an account that had actually been created.
  it("still answers 202 and keeps the account", async () => {
    const spy = vi
      .spyOn(prisma.user, "update")
      .mockRejectedValueOnce(new Error("connection terminated unexpectedly"));

    const res = await request(app).post("/api/auth/signup").send(CREDENTIALS);

    expect(res.status).toBe(202);
    expect(await prisma.user.findUnique({ where: { email: CREDENTIALS.email } })).not.toBeNull();
    spy.mockRestore();
  });
});
