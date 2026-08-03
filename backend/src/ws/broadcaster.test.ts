import { afterEach, describe, expect, it } from "vitest";
import type { Server as HttpServer } from "node:http";
import type { WebSocket } from "ws";
import {
  FakePriceFeed,
  MessageCollector,
  closeAndSettle,
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

describe("broadcaster — unsubscribing and disconnecting clean up correctly", () => {
  it("stops delivering ticks once a client explicitly unsubscribes", async () => {
    const { feed, port } = await setup();
    const { ws, collector } = await client(port);

    ws.send(JSON.stringify({ action: "subscribe", symbols: ["AAPL"] }));
    await wait(50);
    ws.send(JSON.stringify({ action: "unsubscribe", symbols: ["AAPL"] }));
    await wait(50);

    feed.emit("AAPL", fakeTick("AAPL"));
    await wait(50);

    expect(collector.messages).toHaveLength(0);
  });

  it("tears down the upstream subscription once the last client unsubscribes", async () => {
    const { feed, port } = await setup();
    const { ws } = await client(port);

    ws.send(JSON.stringify({ action: "subscribe", symbols: ["AAPL"] }));
    await wait(50);
    expect(feed.activeSymbols()).toContain("AAPL");

    ws.send(JSON.stringify({ action: "unsubscribe", symbols: ["AAPL"] }));
    await wait(50);

    expect(feed.activeSymbols()).not.toContain("AAPL");
  });

  it("keeps the upstream subscription alive if only one of several clients unsubscribes", async () => {
    const { feed, port } = await setup();
    const a = await client(port);
    const b = await client(port);

    a.ws.send(JSON.stringify({ action: "subscribe", symbols: ["AAPL"] }));
    b.ws.send(JSON.stringify({ action: "subscribe", symbols: ["AAPL"] }));
    await wait(50);

    a.ws.send(JSON.stringify({ action: "unsubscribe", symbols: ["AAPL"] }));
    await wait(50);

    expect(feed.activeSymbols()).toContain("AAPL"); // b is still watching

    feed.emit("AAPL", fakeTick("AAPL", { price: 42 }));
    const msg = await b.collector.next();
    expect(msg).toMatchObject({ symbol: "AAPL", price: 42 });
    expect(a.collector.messages).toHaveLength(0); // a shouldn't get this one
  });

  it("tears down the upstream subscription when a client disconnects without unsubscribing first", async () => {
    const { feed, port } = await setup();
    const { ws } = await client(port);

    ws.send(JSON.stringify({ action: "subscribe", symbols: ["AAPL"] }));
    await wait(50);
    expect(feed.activeSymbols()).toContain("AAPL");

    await closeAndSettle(ws);

    expect(feed.activeSymbols()).not.toContain("AAPL");
  });

  it("keeps the upstream subscription alive if only one of several clients disconnects", async () => {
    const { feed, port } = await setup();
    const a = await client(port);
    const b = await client(port);

    a.ws.send(JSON.stringify({ action: "subscribe", symbols: ["AAPL"] }));
    b.ws.send(JSON.stringify({ action: "subscribe", symbols: ["AAPL"] }));
    await wait(50);

    await closeAndSettle(a.ws);

    expect(feed.activeSymbols()).toContain("AAPL"); // b is still connected and watching
  });
});

describe("broadcaster — rejects bad input instead of crashing", () => {
  it("responds with an error for malformed JSON", async () => {
    const { port } = await setup();
    const { ws, collector } = await client(port);

    ws.send("this is not json{{{");

    const msg = await collector.next();
    expect(msg).toMatchObject({ type: "error", message: "Malformed JSON" });
  });

  it("responds with an error for an unrecognized action", async () => {
    const { port } = await setup();
    const { ws, collector } = await client(port);

    ws.send(JSON.stringify({ action: "eavesdrop", symbols: ["AAPL"] }));

    const msg = await collector.next();
    expect(msg).toMatchObject({ type: "error", message: "Invalid subscribe/unsubscribe message" });
  });

  it("responds with an error for an empty symbols array", async () => {
    const { port } = await setup();
    const { ws, collector } = await client(port);

    ws.send(JSON.stringify({ action: "subscribe", symbols: [] }));

    const msg = await collector.next();
    expect(msg).toMatchObject({ type: "error" });
  });

  it("doesn't let a bad message crash the connection — it can still subscribe normally after", async () => {
    const { feed, port } = await setup();
    const { ws, collector } = await client(port);

    ws.send("garbage");
    await collector.next(); // the malformed-JSON error

    ws.send(JSON.stringify({ action: "subscribe", symbols: ["AAPL"] }));
    await wait(50);
    feed.emit("AAPL", fakeTick("AAPL", { price: 55 }));

    const msg = await collector.next();
    expect(msg).toMatchObject({ symbol: "AAPL", price: 55 });
  });
});

describe("broadcaster — per-connection symbol cap", () => {
  const MAX_SYMBOLS = 30;

  it("allows subscribing up to the cap in a single message", async () => {
    const { feed, port } = await setup();
    const { ws } = await client(port);
    const symbols = Array.from({ length: MAX_SYMBOLS }, (_, i) => `SYM${i}`);

    ws.send(JSON.stringify({ action: "subscribe", symbols }));
    await wait(50);

    expect(feed.activeSymbols()).toHaveLength(MAX_SYMBOLS);
  });

  it("rejects going over the cap across multiple messages, with an explanatory error", async () => {
    const { port } = await setup();
    const { ws, collector } = await client(port);
    const symbols = Array.from({ length: MAX_SYMBOLS }, (_, i) => `SYM${i}`);

    ws.send(JSON.stringify({ action: "subscribe", symbols })); // exactly at the cap
    await wait(50);

    ws.send(JSON.stringify({ action: "subscribe", symbols: ["EXTRA1"] })); // valid shape, just one over the cap

    const msg = await collector.next();
    expect(msg).toMatchObject({ type: "error", message: `Max ${MAX_SYMBOLS} symbols per connection` });
  });

  it("doesn't count a symbol twice toward the cap if subscribed again", async () => {
    const { feed, port } = await setup();
    const { ws } = await client(port);
    const symbols = Array.from({ length: MAX_SYMBOLS }, (_, i) => `SYM${i}`);

    ws.send(JSON.stringify({ action: "subscribe", symbols }));
    await wait(50);
    ws.send(JSON.stringify({ action: "subscribe", symbols: ["SYM0"] })); // already subscribed
    await wait(50);

    expect(feed.activeSymbols()).toHaveLength(MAX_SYMBOLS); // unchanged, not rejected either
  });
});

describe("broadcaster — per-connection message rate limit", () => {
  const MAX_MESSAGES_PER_MINUTE = 60;

  it("rejects a message once the per-minute cap is exceeded", async () => {
    const { port } = await setup();
    const { ws, collector } = await client(port);

    // Re-subscribing to the same symbol is a harmless no-op below the cap
    // (no response either way), so every message here is "free" except the
    // one that actually trips the limiter.
    for (let i = 0; i < MAX_MESSAGES_PER_MINUTE + 1; i++) {
      ws.send(JSON.stringify({ action: "subscribe", symbols: ["AAPL"] }));
    }
    await wait(100);

    expect(collector.messages).toHaveLength(1);
    expect(collector.messages[0]).toMatchObject({
      type: "error",
      message: "Too many messages, slow down",
    });
  });

  it("doesn't reject a client staying right at the cap", async () => {
    const { port } = await setup();
    const { ws, collector } = await client(port);

    for (let i = 0; i < MAX_MESSAGES_PER_MINUTE; i++) {
      ws.send(JSON.stringify({ action: "subscribe", symbols: ["AAPL"] }));
    }
    await wait(100);

    expect(collector.messages).toHaveLength(0);
  });
});

describe("broadcaster — max message payload size", () => {
  it("closes the connection if a client sends an oversized frame", async () => {
    const { port } = await setup();
    const { ws } = await client(port);

    const closed = new Promise<number>((resolve) => ws.once("close", (code) => resolve(code)));

    // MAX_PAYLOAD_BYTES is 2KB — this comfortably clears it.
    const oversized = JSON.stringify({ action: "subscribe", symbols: ["AAPL"], padding: "x".repeat(3000) });
    ws.send(oversized);

    const code = await closed;
    expect(code).toBe(1009); // RFC 6455 "message too big"
  });
});
