import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server as HttpServer } from "node:http";
import type { WebSocket } from "ws";
import { prisma } from "../db";
import { createSessionCookieValue, SESSION_COOKIE_NAME } from "../auth/session";
import { disconnectUserSockets } from "./revocation";
import { connectClient, FakePriceFeed, startTestServer } from "./testHelpers";

const USER_ID = "revoke-probe-user";

let server: HttpServer | undefined;
const open: WebSocket[] = [];

beforeEach(async () => {
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: { id: USER_ID, email: "revoke@example.com", passwordHash: "not-a-real-hash" },
  });
});

afterEach(async () => {
  for (const ws of open.splice(0)) ws.terminate();
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server!.close(() => resolve()));
  }
  server = undefined;
  await prisma.watchlistItem.deleteMany();
  await prisma.watchlist.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function connectAs(userId: string) {
  const started = await startTestServer(new FakePriceFeed());
  server = started.server;
  const cookie = `${SESSION_COOKIE_NAME}=${createSessionCookieValue(userId, 0)}`;
  const ws = await connectClient(started.port, cookie);
  open.push(ws);
  return ws;
}

describe("disconnectUserSockets", () => {
  // The gap this closes: the socket resolves who you are once, at the upgrade,
  // and caches it. Bumping the epoch stopped every future REST request but
  // left an already-open socket delivering that user's private alerts.
  it("closes an open socket belonging to the revoked user", async () => {
    const ws = await connectAs(USER_ID);

    const closed = new Promise<number>((resolve) => ws.once("close", (code) => resolve(code)));
    expect(disconnectUserSockets(USER_ID)).toBe(1);

    await expect(closed).resolves.toBe(1008);
  });

  it("leaves other users' sockets alone", async () => {
    const ws = await connectAs(USER_ID);

    expect(disconnectUserSockets("somebody-else")).toBe(0);
    expect(ws.readyState).toBe(ws.OPEN);
  });

  it("does nothing when no broadcaster is attached", async () => {
    expect(disconnectUserSockets(USER_ID)).toBe(0);
  });
});
