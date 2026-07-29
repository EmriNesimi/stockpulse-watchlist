import type { NextFunction, Request, RequestHandler, Response } from "express";

// Express 4 doesn't catch rejected promises from async route handlers on its
// own — without this, a thrown error just hangs the request forever.
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
