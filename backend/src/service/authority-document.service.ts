import { randomUUID } from 'node:crypto';
import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
} from '@imagekit/nodejs';
import {
  AUTHORITY_DOCUMENT_EXTENSIONS,
  AUTHORITY_DOCUMENT_FOLDER,
  AUTHORITY_DOCUMENT_TAGS,
  imageKitClient,
} from '../config/imagekit.js';
import type { AuthorityDocumentUpload } from '../config/imagekit.js';
import type { UploadedAuthorityDocument } from '../models/authority.model.js';
import { AppError, BadRequestError, InternalServerError } from '../utils/api-error.js';
import { logger } from '../utils/logger.js';

/**
 * ImageKit integration for government identity documents.
 *
 * This is the only place that handles the bytes of a candidate's ID document.
 * What leaves it is a reference, not the file:
 *
 *  - `isPrivateFile: true` marks the upload private, so the URL only resolves for
 *    a signed request. That is the reason the stored `document_url` is never
 *    handed to a candidate - see `toSafeAuthorityApplication` in
 *    src/models/authority.model.ts, which returns `hasDocument` instead.
 *  - The document bytes are never written to the disk or to PostgreSQL. multer
 *    buffers them in memory, they are forwarded, and the buffer is collected.
 *
 * Nothing in this file logs the file name, the bytes, or any field of the
 * application. The log context is limited to size and mime type, which is what is
 * needed to diagnose a failed upload without putting identity data into the log
 * store.
 */

/**
 * Extensions are derived from the accepted MIME type rather than from
 * `file.originalname`, exactly as in src/service/image.service.ts: the client
 * supplied name is discarded, which removes any chance of path traversal or
 * unexpected characters reaching ImageKit (only `a-z A-Z 0-9 . - _ /` are allowed
 * there).
 */
const toDocumentName = (mimetype: string): string => {
  const extension = AUTHORITY_DOCUMENT_EXTENSIONS[mimetype];

  if (!extension) {
    throw new BadRequestError('Unsupported document type', 'UNSUPPORTED_DOCUMENT_TYPE');
  }

  return `authority-document-${randomUUID()}${extension}`;
};

/** Maps an ImageKit failure onto an error that is safe to show to the candidate. */
const toDocumentUploadError = (error: unknown): AppError => {
  if (error instanceof APIConnectionTimeoutError) {
    return new InternalServerError('Document upload timed out, please try again', 'DOCUMENT_UPLOAD_TIMEOUT');
  }

  if (error instanceof APIConnectionError) {
    return new InternalServerError('Document upload service is unreachable, please try again', 'DOCUMENT_UPLOAD_UNREACHABLE');
  }

  if (error instanceof AuthenticationError) {
    // A misconfigured .env. The details stay server side; the candidate is never
    // told that credentials were rejected.
    return new InternalServerError('Document upload is not available right now', 'DOCUMENT_UPLOAD_UNAVAILABLE');
  }

  if (error instanceof APIError) {
    return new BadRequestError('The document could not be processed', 'DOCUMENT_REJECTED');
  }

  return new InternalServerError('Document upload failed, please try again', 'DOCUMENT_UPLOAD_FAILED');
};

/**
 * Uploads one identity document as a private ImageKit file and returns the
 * reference to store on the application.
 *
 * `file.buffer` is the in-memory copy multer produced.
 */
export const uploadAuthorityDocument = async (
  file: UploadedAuthorityDocument,
): Promise<AuthorityDocumentUpload> => {
  const fileName = toDocumentName(file.mimetype);

  // Node 20+ exposes a global File, which is the upload type the SDK expects.
  // multer buffers into a Node Buffer, which is a Uint8Array view that may sit on
  // a SharedArrayBuffer; copying it into a plain Uint8Array gives the SDK the
  // ArrayBuffer backed view its `BlobPart` type requires.
  const bytes = new Uint8Array(file.buffer);
  const payload = new File([bytes], fileName, { type: file.mimetype });

  let uploaded: { url?: string; fileId?: string };

  try {
    uploaded = await imageKitClient.files.upload({
      file: payload,
      fileName,
      folder: AUTHORITY_DOCUMENT_FOLDER,
      useUniqueFileName: true,
      // Private: the URL is not publicly resolvable, so it cannot leak through a
      // shared link, a referrer header or a browser history entry.
      isPrivateFile: true,
      tags: [...AUTHORITY_DOCUMENT_TAGS],
    });
  } catch (error) {
    // Log the reason (never the credentials, never the document, never the
    // applicant) and return a sanitised error.
    logger.error('ImageKit document upload failed', {
      reason: error instanceof Error ? error.message : 'unknown error',
      fileSize: file.size,
      mimetype: file.mimetype,
    });

    throw toDocumentUploadError(error);
  }

  if (!uploaded.url || !uploaded.fileId) {
    logger.error('ImageKit document upload returned an incomplete response', {
      hasUrl: Boolean(uploaded.url),
      hasFileId: Boolean(uploaded.fileId),
    });

    throw new InternalServerError('Document upload failed, please try again', 'DOCUMENT_UPLOAD_INCOMPLETE');
  }

  return { documentUrl: uploaded.url, documentFileId: uploaded.fileId, mimeType: file.mimetype };
};