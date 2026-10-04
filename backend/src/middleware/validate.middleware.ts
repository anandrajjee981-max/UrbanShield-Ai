import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { BadRequestError } from '../utils/api-error.js';

/**
 * Validates `req.body` against a Zod schema before the controller runs and
 * replaces the body with the parsed (trimmed, defaulted) value, so controllers
 * and services receive strongly typed data.
 */
export const validateBody =
  <TBody>(schema: ZodType<TBody>): RequestHandler<Record<string, string>, unknown, TBody> =>
  (req: Request<Record<string, string>, unknown, TBody>, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map(
        (issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`,
      );

      next(new BadRequestError('Validation failed', 'VALIDATION_ERROR', errors));
      return;
    }

    req.body = result.data;
    next();
  };

/**
 * Validates `req.query` against a Zod schema before the controller runs.
 * Express parses the query string into string values, so schemas are expected
 * to coerce (e.g. `z.coerce.number()`). Invalid queries become a 400 with
 * field-level errors instead of reaching the service layer.
 */
export const validateQuery =
  (schema: ZodType<unknown>): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = result.error.issues.map(
        (issue) => `${issue.path.join('.') || 'query'}: ${issue.message}`,
      );

      next(new BadRequestError('Validation failed', 'VALIDATION_ERROR', errors));
      return;
    }

    // Express 5 exposes `req.query` as a getter-only property, so a plain
    // assignment throws. Redefine it instead (also works on Express 4).
    Object.defineProperty(req, 'query', {
      value: result.data,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    next();
  };
