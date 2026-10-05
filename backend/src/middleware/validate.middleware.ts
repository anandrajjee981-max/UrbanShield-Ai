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
