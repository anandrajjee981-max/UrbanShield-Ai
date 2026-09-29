import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps an async handler so a rejected promise is forwarded to the central
 * error middleware instead of becoming an unhandled rejection.
 *
 * Express 5 does this automatically; the wrapper keeps the controllers explicit
 * and makes the behaviour independent of the framework version.
 */
export const asyncHandler = <
  TParams,
  TResponseBody,
  TRequestBody,
  TRequestQuery = unknown,
>(
  handler: (
    req: Request<TParams, TResponseBody, TRequestBody, TRequestQuery>,
    res: Response<TResponseBody>,
    next: NextFunction,
  ) => unknown,
): RequestHandler<TParams, TResponseBody, TRequestBody, TRequestQuery> =>
  (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };
