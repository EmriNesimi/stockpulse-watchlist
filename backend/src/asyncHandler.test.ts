import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "./asyncHandler";

const req = {} as Request;
const res = {} as Response;

// Kept deliberately even though Express 5 forwards async rejections itself -
// the file says so. What makes that safe is the detail below: it returns
// undefined rather than the promise, so Express never sees one and the two
// can't both react to the same rejection. Untested until now, on every route.
describe("asyncHandler", () => {
  it("forwards a rejection to next()", async () => {
    const boom = new Error("boom");
    const next = vi.fn() as unknown as NextFunction;

    asyncHandler(async () => {
      throw boom;
    })(req, res, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(boom));
  });

  // Not a gap to fix: fn() is invoked before Promise.resolve can wrap it, so
  // a synchronous throw leaves the wrapper untouched and Express 5's router
  // catches it the same way it would without this wrapper at all. Written
  // down because the natural assumption is that a thing called asyncHandler
  // catches everything, and the first draft of this test assumed exactly
  // that and failed.
  it("lets a synchronous throw propagate for Express itself to handle", () => {
    const boom = new Error("sync boom");
    const next = vi.fn() as unknown as NextFunction;

    expect(() =>
      asyncHandler(() => {
        throw boom;
      })(req, res, next)
    ).toThrow(boom);
    expect(next).not.toHaveBeenCalled();
  });

  it("leaves next() alone when the handler resolves", async () => {
    const next = vi.fn() as unknown as NextFunction;

    asyncHandler(async () => undefined)(req, res, next);
    await new Promise((r) => setImmediate(r));
    expect(next).not.toHaveBeenCalled();
  });

  it("returns undefined, not the promise", () => {
    // The whole reason the wrapper is safe to keep on Express 5: the router
    // only applies its own rejection handling to a handler that returns a
    // promise. Returning one here would mean both this and Express react.
    const returned = asyncHandler(async () => undefined)(req, res, vi.fn() as unknown as NextFunction);
    expect(returned).toBeUndefined();
  });

  it("passes req, res and next straight through", async () => {
    const handler = vi.fn(async () => undefined);
    const next = vi.fn() as unknown as NextFunction;

    asyncHandler(handler)(req, res, next);
    await new Promise((r) => setImmediate(r));
    expect(handler).toHaveBeenCalledWith(req, res, next);
  });
});
