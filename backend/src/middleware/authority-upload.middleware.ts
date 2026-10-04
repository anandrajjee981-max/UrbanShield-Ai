import type { RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { AUTHORITY_DOCUMENT_MAX_BYTES } from '../config/imagekit.js';
import { AUTHORITY_DOCUMENT_MIME_TYPES } from '../types/authority.types.js';
import { AppError, BadRequestError } from '../utils/api-error.js';

/**
 * Multipart handling for the single government identity document on an authority
 * application.
 *
 * Structurally the same contract as `uploadIssueImage`
 * (src/middleware/upload.middleware.ts) - memory storage, one file, size and type
 * checked while streaming - but with a different allow list, because an identity
 * document is a different kind of file from a street photo:
 *
 *  - PDF is accepted, since government ID scans are routinely issued as PDF.
 *  - The file is forwarded to ImageKit as a *private* file (see
 *    src/service/authority-document.service.ts). The bytes never touch the disk
 *    and never enter PostgreSQL; only a reference is stored.
 *
 * The document is mandatory for an application, so unlike the issue photo this
 * middleware does not make the file optional - the service rejects a submission
 * without one. Checking that here rather than in the service would mean
 * accepting a request whose body is already invalid, so it is left to the service
 * where the rule belongs.
 */

/** The form field the identity document must be sent in. */
export const AUTHORITY_DOCUMENT_FIELD = 'document';

const ALLOWED_MIME_TYPES = new Set<string>(AUTHORITY_DOCUMENT_MIME_TYPES);

const maxMegabytes = Math.round(AUTHORITY_DOCUMENT_MAX_BYTES / (1024 * 1024));

/**
 * Type allow list, applied by multer before the bytes are buffered.
 *
 * The mime type comes from the multipart headers, which a client controls, so
 * this stops a `.exe` or an `.html` upload from being stored; it is not by itself
 * proof that the content really is an image. That is an acceptable residual risk
 * here because the file is never served back as an active document - it is a
 * private ImageKit file reachable only through the admin review screen - and
 * because ImageKit stores it as a file reference rather than executing or hosting
 * it.
 */
const fileFilter: multer.Options['fileFilter'] = (_req, file, callback) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    callback(
      new BadRequestError(
        `Unsupported document type. Allowed types: ${AUTHORITY_DOCUMENT_MIME_TYPES.join(', ')}`,
        'UNSUPPORTED_DOCUMENT_TYPE',
      ),
    );
    return;
  }

  callback(null, true);
};

const parseDocument = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: AUTHORITY_DOCUMENT_MAX_BYTES,
    files: 1,
    // The application has 12 accepted fields; the cap leaves room for the file
    // part and rejects a padded or oversized form.
    fields: 20,
  },
  fileFilter,
}).single(AUTHORITY_DOCUMENT_FIELD);

/** Translates multer's errors into the `AppError` shape the error middleware expects. */
const toUploadError = (error: MulterError): AppError => {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return new BadRequestError(`Document must be at most ${maxMegabytes} MB`, 'DOCUMENT_TOO_LARGE');
    case 'LIMIT_UNEXPECTED_FILE':
      return new BadRequestError(
        `Unexpected file field "${error.field ?? ''}". Send the identity document in the "${AUTHORITY_DOCUMENT_FIELD}" field`,
        'UNEXPECTED_FILE_FIELD',
      );
    case 'LIMIT_FILE_COUNT':
    case 'LIMIT_PART_COUNT':
      return new BadRequestError('Only one document can be attached to an application', 'TOO_MANY_FILES');
    case 'LIMIT_FIELD_COUNT':
      return new BadRequestError('Too many form fields in the request', 'TOO_MANY_FIELDS');
    case 'LIMIT_FIELD_KEY':
    case 'LIMIT_FIELD_VALUE':
      return new BadRequestError('A form field name or value is too long', 'INVALID_FORM_FIELD');
    default:
      return new BadRequestError('Document upload could not be processed', 'INVALID_UPLOAD');
  }
};

/**
 * Populates `req.file` with the identity document, if one was sent.
 *
 * Mounted after `authenticate` so an unauthenticated caller can never make the
 * server buffer a file. Whether the file was actually required is decided by the
 * service, which owns that business rule.
 */
export const uploadAuthorityDocument: RequestHandler = (req, res, next) => {
  parseDocument(req, res, (error?: unknown) => {
    if (error === undefined || error === null) {
      next();
      return;
    }

    next(error instanceof MulterError ? toUploadError(error) : error);
  });
};