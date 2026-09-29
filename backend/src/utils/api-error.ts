/**
 * Operational (expected) application errors.
 *
 * Anything thrown as an `AppError` is considered safe to show to the client.
 * Every other error is treated as a bug and reported as a generic 500 by the
 * central error middleware.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: string[];
  readonly isOperational = true;

  constructor(statusCode: number, message: string, code: string, details?: string[]) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, new.target);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code = 'BAD_REQUEST', details?: string[]) {
    super(400, message, code, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED', details?: string[]) {
    super(401, message, code, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action', code = 'FORBIDDEN') {
    super(403, message, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(404, message, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', code = 'CONFLICT') {
    super(409, message, code);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests, please try again later', code = 'TOO_MANY_REQUESTS') {
    super(429, message, code);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', code = 'INTERNAL_SERVER_ERROR') {
    super(500, message, code);
  }
}
