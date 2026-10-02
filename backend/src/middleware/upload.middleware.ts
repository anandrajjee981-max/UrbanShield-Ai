import type { RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { env } from '../config/env.js';
import { ISSUE_IMAGE_MIME_TYPES } from '../config/imagekit.js';
import { AppError, BadRequestError } from '../utils/api-error.js';

/**
 * Multipart handling for the single optional issue photo.
 *
 * `POST /api/issues` accepts `multipart/form-data` (photo + fields) and plain
 * `application/json` (fields only, no photo). multer skips non multipart
 * requests, so both reach the rest of the pipeline with a parsed `req.body`.
 *
 * Files are buffered in memory, never written to disk: the buffer is forwarded
 * to ImageKit and then garbage collected. Only the resulting URL and file id are
 * persisted, so image bytes never enter PostgreSQL.
 */

/** The form field the citizen photo must be sent in. */
export const ISSUE_IMAGE_FIELD = 'image';

const ALLOWED_MIME_TYPES = new Set<string>(ISSUE_IMAGE_MIME_TYPES);

/**
 * Only the three types ImageKit-based issue photos need are accepted, and the
 * cap is enforced by multer while streaming, so an oversized upload is aborted
 * instead of being fully buffered.
 */
const fileFilter: multer.Options['fileFilter'] = (_req, file, callback) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    callback(
      new BadRequestError(
        `Unsupported image type. Allowed types: ${ISSUE_IMAGE_MIME_TYPES.join(', ')}`,
        'UNSUPPORTED_IMAGE_TYPE',
      ),
    );
    return;
  }

  callback(null, true);
};

const maxMegabytes = Math.round(env.ISSUE_IMAGE_MAX_BYTES / (1024 * 1024));

const parseImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.ISSUE_IMAGE_MAX_BYTES,
    files: 1,
    fields: 20,
  },
  fileFilter,
}).single(ISSUE_IMAGE_FIELD);

/**
 * Translates multer's own errors into the `AppError` shape the central error
 * middleware understands, so an oversized or misnamed file is a clean 400
 * instead of a generic 500. Anything else is passed through untouched.
 */
const toUploadError = (error: MulterError): AppError => {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return new BadRequestError(`Image must be at most ${maxMegabytes} MB`, 'IMAGE_TOO_LARGE');
    case 'LIMIT_UNEXPECTED_FILE':
      return new BadRequestError(
        `Unexpected file field "${error.field ?? ''}". Send the issue photo in the "${ISSUE_IMAGE_FIELD}" field`,
        'UNEXPECTED_FILE_FIELD',
      );
    case 'LIMIT_FILE_COUNT':
    case 'LIMIT_PART_COUNT':
      return new BadRequestError('Only one image can be attached to an issue', 'TOO_MANY_FILES');
    case 'LIMIT_FIELD_COUNT':
      return new BadRequestError('Too many form fields in the request', 'TOO_MANY_FIELDS');
    case 'LIMIT_FIELD_KEY':
    case 'LIMIT_FIELD_VALUE':
      return new BadRequestError('A form field name or value is too long', 'INVALID_FORM_FIELD');
    default:
      return new BadRequestError('Image upload could not be processed', 'INVALID_UPLOAD');
  }
};

/**
 * Populates `req.file` with the citizen photo, if one was sent. Mounted after
 * `authenticate` so an unauthenticated caller can never make the server buffer
 * a file.
 */
export const uploadIssueImage: RequestHandler = (req, res, next) => {
  parseImage(req, res, (error?: unknown) => {
    if (error === undefined || error === null) {
      next();
      return;
    }

    next(error instanceof MulterError ? toUploadError(error) : error);
  });
};
