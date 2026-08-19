import { describe, expect, it } from "vitest";
import { parseServerMessage } from "./wsMessages";

const tick = { type: "tick", symbol: "AAPL", price: 231.42, changePercent: 0.87, source: "simulated" };
const alert = {
  type: "alert",
  id: "cabc123",
  symbol: "AAPL",
  threshold: 200,
  direction: "above",
  price: 201.5,
  triggeredAt: "2026-01-01T00:00:00.000Z",
};

function parse(value: unknown) {
  return parseServerMessage(typeof value === "string" ? value : JSON.stringify(value));
}

describe("parseServerMessage", () => {
  it("accepts a well-formed tick", () => {
    expect(parse(tick)).toEqual(tick);
  });

  it("accepts a well-formed alert", () => {
    expect(parse(alert)).toEqual(alert);
  });

  it("accepts an error message", () => {
    expect(parse({ type: "error", message: "Too many messages" })).toEqual({
      type: "error",
      message: "Too many messages",
    });
  });

  it("rejects a tick whose price is a string", () => {
    // The case that motivated this: price.toFixed() would throw mid-render.
    expect(parse({ ...tick, price: "231.42" })).toBeNull();
  });

  it("rejects NaN and Infinity prices", () => {
    expect(
      parseServerMessage('{"type":"tick","symbol":"AAPL","price":null,"changePercent":0,"source":"live"}')
    ).toBeNull();
    expect(parse({ ...tick, changePercent: Number.POSITIVE_INFINITY })).toBeNull();
  });

  it("rejects an unknown source", () => {
    expect(parse({ ...tick, source: "guessed" })).toBeNull();
  });

  it("rejects a tick missing a field", () => {
    const { changePercent: _dropped, ...partial } = tick;
    expect(parse(partial)).toBeNull();
  });

  it("rejects an alert with an invalid direction", () => {
    expect(parse({ ...alert, direction: "sideways" })).toBeNull();
  });

  it("rejects an error message with no text", () => {
    expect(parse({ type: "error", message: "" })).toBeNull();
  });

  it("rejects unknown message types", () => {
    expect(parse({ type: "something-new", payload: 1 })).toBeNull();
  });

  it("rejects malformed JSON, arrays and primitives", () => {
    expect(parseServerMessage("not json at all")).toBeNull();
    expect(parseServerMessage("[1,2,3]")).toBeNull();
    expect(parseServerMessage("42")).toBeNull();
    expect(parseServerMessage("null")).toBeNull();
  });

  it("rejects a non-string frame", () => {
    expect(parseServerMessage(new ArrayBuffer(8))).toBeNull();
    expect(parseServerMessage(undefined)).toBeNull();
  });
});
