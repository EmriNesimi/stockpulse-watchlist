import { createApp } from "./app";
import { env } from "./env";

const app = createApp();

app.listen(env.port, () => {
  console.log(`StockPulse backend listening on port ${env.port}`);
  if (!env.polygonApiKey) {
    console.log("No POLYGON_API_KEY set — running on the simulated price feed.");
  }
});
