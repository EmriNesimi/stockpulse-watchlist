import { afterEach, describe, expect, it, vi } from "vitest";

// API_BASE and WS_URL are both computed at module load, so each case needs a
// fresh import rather than a re-read.
async function loadWsUrl(apiUrl?: string) {
  vi.resetModules();
  if (apiUrl === undefined) vi.stubEnv("VITE_API_URL", undefined as unknown as string);
  else vi.stubEnv("VITE_API_URL", apiUrl);
  return (await import("./ws")).WS_URL;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("WS_URL", () => {
  it("upgrades https to wss", async () => {
    await expect(loadWsUrl("https://api.example.com")).resolves.toBe("wss://api.example.com/ws");
  });

  it("upgrades http to ws", async () => {
    await expect(loadWsUrl("http://localhost:4000")).resolves.toBe("ws://localhost:4000/ws");
  });

  // Render's dashboard takes these by hand, and a var that exists but is
  // blank is an easy thing to end up with. ?? only catches null/undefined, so
  // an empty string became API_BASE "" and a WS_URL of "/ws" — which isn't a
  // URL the WebSocket constructor accepts, so it throws on sight.
  it("treats a blank VITE_API_URL as unset rather than building '/ws'", async () => {
    await expect(loadWsUrl("")).resolves.toBe("ws://localhost:4000/ws");
  });

  it("treats a whitespace-only VITE_API_URL as unset too", async () => {
    await expect(loadWsUrl("   ")).resolves.toBe("ws://localhost:4000/ws");
  });
});
