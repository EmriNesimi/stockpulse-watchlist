import type { NextFunction, Request, RequestHandler, Response } from "express";

// Written for Express 4, which didn't catch rejected promises from async route
// handlers and would leave the request hanging forever. Express 5 does handle
// it — its router checks whether a handler returned a promise and forwards a
// rejection to next() (see router/lib/layer.js). So this is no longer load
// bearing.
//
// Kept anyway, and deliberately: it returns undefined rather than the promise,
// so Express 5's own handling never sees one and the two can't both react.
// Removing it would mean touching every route to prove nothing depends on the
// wrapper's exact timing, for no behavioural gain.
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
