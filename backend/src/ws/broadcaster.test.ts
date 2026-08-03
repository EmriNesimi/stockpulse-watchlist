import { afterEach, describe, expect, it } from "vitest";
import type { Server as HttpServer } from "node:http";
import type { WebSocket } from "ws";
import {
  FakePriceFeed,
  MessageCollector,
  connectClient,
  fakeTick,
  startTestServer,
  wait,
} from "./testHelpers";

// These are real integration tests: a real http server, a real WebSocketServer
// via attachBroadcaster, and real `ws` client connections — not mocks. The
// only fake is the upstream PriceFeed, so we can trigger ticks by hand.
let server: HttpServer | undefined;
const clients: WebSocket[] = [];

afterEach(async () => {
  for (const client of clients) client.close();
  clients.length = 0;
  await new Promise<void>((resolve) => server?.close(() => resolve()));
  server = undefined;
});

async function setup() {
  const feed = new FakePriceFeed();
  const { server: s, port } = await startTestServer(feed);
  server = s;
  return { feed, port };
}

async function client(port: number) {
  const ws = await connectClient(port);
  clients.push(ws);
  return { ws, collector: new MessageCollector(ws) };
}

describe("broadcaster — subscribing and receiving ticks", () => {
  it("delivers a tick to a client subscribed to that symbol", async () => {
    const { feed, port } = await setup();
    const { ws, collector } = await client(port);

    ws.send(JSON.stringify({ action: "subscribe", symbols: ["AAPL"] }));
    await wait(50); // let the subscribe message get processed server-side

    feed.emit("AAPL", fakeTick("AAPL", { price: 231.5 }));

    const msg = await collector.next();
    expect(msg).toMatchObject({ type: "tick", symbol: "AAPL", price: 231.5 });
  });

  it("does not deliver ticks for a symbol the client never subscribed to", async () => {
    const { feed, port } = await setup();
    const { ws, collector } = await client(port);

    ws.send(JSON.stringify({ action: "subscribe", symbols: ["AAPL"] }));
    await wait(50);

    feed.emit("MSFT", fakeTick("MSFT")); // nobody's listening for this one
    await wait(50);

    expect(collector.messages).toHaveLength(0);
  });

  it("opens only one upstream subscription per symbol even with multiple clients watching it", async () => {
    const { feed, port } = await setup();
    const a = await client(port);
    const b = await client(port);

    a.ws.send(JSON.stringify({ action: "subscribe", symbols: ["AAPL"] }));
    b.ws.send(JSON.stringify({ action: "subscribe", symbols: ["AAPL"] }));
    await wait(50);

    expect(feed.subscribeCalls.filter((s) => s === "AAPL")).toHaveLength(1);
  });

  it("fans a single tick out to every client subscribed to that symbol", async () => {
    const { feed, port } = await setup();
    const a = await client(port);
    const b = await client(port);

    a.ws.send(JSON.stringify({ action: "subscribe", symbols: ["AAPL"] }));
    b.ws.send(JSON.stringify({ action: "subscribe", symbols: ["AAPL"] }));
    await wait(50);

    feed.emit("AAPL", fakeTick("AAPL", { price: 100.25 }));

    const [msgA, msgB] = await Promise.all([a.collector.next(), b.collector.next()]);
    expect(msgA).toMatchObject({ symbol: "AAPL", price: 100.25 });
    expect(msgB).toMatchObject({ symbol: "AAPL", price: 100.25 });
  });
});
