import { afterEach, describe, expect, it } from "vitest";
import type { Server as HttpServer } from "node:http";
import { WebSocket } from "ws";
import { clientIpFrom, MAX_CONNECTIONS_PER_IP } from "./broadcaster";
import { connectClient, FakePriceFeed, MessageCollector, startTestServer } from "./testHelpers";

let server: HttpServer | undefined;
const open: WebSocket[] = [];

afterEach(async () => {
  // terminate, not close: a graceful close waits for the peer, and
  // server.close() then blocks on those half-open sockets until the hook
  // times out.
  for (const ws of open.splice(0)) ws.terminate();
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server!.close(() => resolve()));
  }
  server = undefined;
});

async function start() {
  const started = await startTestServer(new FakePriceFeed());
  server = started.server;
  return started.port;
}

function track(ws: WebSocket) {
  open.push(ws);
  return ws;
}

/** Spend the whole per-minute allowance on one connection. */
async function exhaustBudget(ws: WebSocket, collector: MessageCollector) {
  for (let i = 0; i < 61; i++) ws.send(JSON.stringify({ action: "subscribe", symbols: ["AAPL"] }));
  // The 61st is the first over the line.
  const msg = (await collector.next()) as { type: string; message: string };
  expect(msg).toMatchObject({ type: "error", message: "Too many messages, slow down" });
}

describe("clientIpFrom", () => {
  // trust proxy is 1, so only the last hop is ours. Taking the first entry
  // would let a client pick its own rate-limit bucket via the header.
  it("takes the rightmost forwarded hop, not the client-supplied first one", () => {
    expect(clientIpFrom({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" }, "10.0.0.1")).toBe("3.3.3.3");
  });

  it("falls back to the socket address when unproxied", () => {
    expect(clientIpFrom({}, "10.0.0.1")).toBe("10.0.0.1");
  });

  it("ignores an empty header rather than returning a blank key", () => {
    expect(clientIpFrom({ "x-forwarded-for": "" }, "10.0.0.1")).toBe("10.0.0.1");
  });
});

describe("websocket abuse limits", () => {
  // The regression this whole change exists for: the budget used to live on
  // per-connection state, so hanging up and dialling back gave you a new 60.
  it("keeps the message budget spent across a reconnect", async () => {
    const port = await start();

    const first = track(await connectClient(port));
    await exhaustBudget(first, new MessageCollector(first));
    first.close();

    const second = track(await connectClient(port));
    const collector = new MessageCollector(second);
    second.send(JSON.stringify({ action: "subscribe", symbols: ["AAPL"] }));

    const msg = (await collector.next()) as { type: string; message: string };
    expect(msg).toMatchObject({ type: "error", message: "Too many messages, slow down" });
  });

  it("refuses the upgrade past the per-IP connection cap", async () => {
    const port = await start();

    for (let i = 0; i < MAX_CONNECTIONS_PER_IP; i++) track(await connectClient(port));

    await expect(connectClient(port)).rejects.toThrow(/429|Unexpected server response/);
  });

  it("frees a slot when a connection closes", async () => {
    const port = await start();

    const sockets = [];
    for (let i = 0; i < MAX_CONNECTIONS_PER_IP; i++) sockets.push(track(await connectClient(port)));

    await new Promise<void>((resolve) => {
      sockets[0].once("close", () => resolve());
      sockets[0].close();
    });

    // Tracked like the rest: an untracked socket keeps the server open and
    // hangs the teardown.
    const revived = track(await connectClient(port));
    expect(revived.readyState).toBe(WebSocket.OPEN);
  });
});
