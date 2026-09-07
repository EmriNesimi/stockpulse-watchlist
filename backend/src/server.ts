import { createServer } from "http";
import { createApp } from "./app";
import { env } from "./env";
import { logger } from "./logger";
import { createPriceFeed } from "./priceFeed";
import { attachBroadcaster } from "./ws/broadcaster";

const app = createApp();
const server = createServer(app);
const priceFeed = createPriceFeed();
const wss = attachBroadcaster(server, priceFeed);

server.listen(env.port, () => {
  logger.info("listening", { port: env.port });
  if (!env.massiveApiKey) {
    logger.info("no MASSIVE_API_KEY set, using the simulated price feed");
  }
});

// Render sends SIGTERM before replacing an instance on every deploy. Without a
// handler Node exits on the spot, cutting off requests mid-flight and dropping
// every open WebSocket without a close frame — so clients see a socket error
// and start their reconnect backoff instead of a clean shutdown.
//
// The timer is the important half: server.close() waits for open connections,
// and a long-lived WebSocket never closes on its own, so waiting politely
// forever would just get us SIGKILLed later with nothing gained.
const SHUTDOWN_GRACE_MS = 10_000;

function shutdown(signal: string) {
  logger.info("shutting down", { signal });

  const forced = setTimeout(() => {
    logger.warn("shutdown grace expired, exiting anyway", { graceMs: SHUTDOWN_GRACE_MS });
    process.exit(0);
  }, SHUTDOWN_GRACE_MS);
  forced.unref();

  for (const client of wss.clients) client.close(1001, "Server shutting down");

  server.close(() => {
    clearTimeout(forced);
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
