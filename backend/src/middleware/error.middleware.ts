import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { DatabaseError } from 'pg';
import { AppError, InternalServerError, NotFoundError } from '../utils/api-error.js';
import { sendError } from '../utils/api-response.js';
import { logger } from '../utils/logger.js';

/** Catch-all for requests that did not match any route. */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`, 'ROUTE_NOT_FOUND'));
};

/**
 * PostgreSQL `unique_violation`. Raised when two requests race between the
 * duplicate-email check and the insert.
 */
const UNIQUE_VIOLATION = '23505';

/** PostgreSQL `check_violation`, raised when a column constraint rejects a value. */
const CHECK_VIOLATION = '23514';

const isBodyParserSyntaxError = (error: unknown): error is SyntaxError & { status: number; body: unknown } =>
  error instanceof SyntaxError && 'status' in error && 'body' in error;

const toStatusCode = (error: unknown): number => {
  if (error instanceof AppError) return error.statusCode;

  if (error instanceof ZodError) return 400;

  if (isBodyParserSyntaxError(error)) return 400;

  if (error instanceof DatabaseError) {
    switch (error.code) {
      case UNIQUE_VIOLATION:
        return 409;
      case CHECK_VIOLATION:
        return 400;
      default:
        return 500;
    }
  }

  return 500;
};

/**
 * Central error middleware.
 *
 * Operational errors keep their status code and message. Everything else is
 * logged server side and reported as a generic 500, so SQL text, stack traces,
 * driver messages and configuration values never reach the client.
 */
export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const statusCode = toStatusCode(error);

  // 5xx and unexpected errors are our fault and must be traced server side.
  if (statusCode >= 500) {
    logger.error('Unhandled server error', {
      error: error instanceof Error ? error.message : 'unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  if (error instanceof AppError) {
    sendError(res, error.statusCode, error.message, error.code, error.details);
    return;
  }

  if (error instanceof ZodError) {
    sendError(
      res,
      400,
      'Validation failed',
      'VALIDATION_ERROR',
      error.issues.map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`),
    );
    return;
  }

  if (isBodyParserSyntaxError(error)) {
    sendError(res, 400, 'Request body contains invalid JSON', 'INVALID_JSON');
    return;
  }

  if (error instanceof DatabaseError) {
    if (error.code === UNIQUE_VIOLATION) {
      sendError(res, 409, 'A record with these values already exists', 'DUPLICATE_RESOURCE');
      return;
    }

    if (error.code === CHECK_VIOLATION) {
      sendError(res, 400, 'Request contains values that are not allowed', 'CONSTRAINT_VIOLATION');
      return;
    }

    // Any other driver error is reported as a generic 500 (logged above).
    sendError(res, 500, 'Internal server error', 'INTERNAL_SERVER_ERROR');
    return;
  }

  const internalError = new InternalServerError();
  sendError(res, internalError.statusCode, internalError.message, internalError.code);
};
