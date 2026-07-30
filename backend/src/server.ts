import { createServer } from "http";
import { createApp } from "./app";
import { env } from "./env";
import { createPriceFeed } from "./priceFeed";
import { attachBroadcaster } from "./ws/broadcaster";

const app = createApp();
const server = createServer(app);
const priceFeed = createPriceFeed();
attachBroadcaster(server, priceFeed);

server.listen(env.port, () => {
  console.log(`StockPulse backend listening on port ${env.port}`);
  if (!env.massiveApiKey) {
    console.log("No MASSIVE_API_KEY set — running on the simulated price feed.");
  }
});
