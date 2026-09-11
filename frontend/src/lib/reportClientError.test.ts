import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reportClientError, resetClientErrorReports } from "./api";

beforeEach(() => {
  resetClientErrorReports();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetClientErrorReports();
});

const posts = () =>
  vi.mocked(fetch).mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === "POST");

describe("reportClientError", () => {
  it("sends the first occurrence", () => {
    reportClientError({ message: "boom" });

    expect(posts()).toHaveLength(1);
  });

  // A throw inside a tick handler fires on every tick. Without this, one bug
  // becomes a request every 1.5s for as long as the tab is open.
  it("sends a repeated message only once", () => {
    reportClientError({ message: "boom" });
    reportClientError({ message: "boom" });
    reportClientError({ message: "boom" });

    expect(posts()).toHaveLength(1);
  });

  it("still sends a genuinely different message", () => {
    reportClientError({ message: "boom" });
    reportClientError({ message: "different" });

    expect(posts()).toHaveLength(2);
  });

  // Dedupe alone is defeated by a message carrying a counter or timestamp,
  // which is unique every time and would report forever.
  it("stops after enough distinct messages", () => {
    for (let i = 0; i < 50; i++) reportClientError({ message: `failed at ${i}ms` });

    expect(posts()).toHaveLength(20);
  });
});
