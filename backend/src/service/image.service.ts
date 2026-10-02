import { randomUUID } from 'node:crypto';
import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
} from '@imagekit/nodejs';
import { ISSUE_IMAGE_FOLDER, imageKitClient } from '../config/imagekit.js';
import type { IssueImageUpload } from '../config/imagekit.js';
import type { UploadedImageFile } from '../models/issue.model.js';
import { AppError, BadRequestError, InternalServerError } from '../utils/api-error.js';
import { logger } from '../utils/logger.js';

/**
 * ImageKit integration for citizen issue photos.
 *
 * The browser sends the file to this API, the API forwards it to ImageKit and
 * only the resulting URL and file id are stored on the issue. Image bytes are
 * never written to PostgreSQL, and the private key never leaves the server.
 */

/**
 * Extensions are derived from the accepted MIME type rather than from
 * `file.originalname`: the client supplied name is discarded, which removes any
 * chance of path traversal or unexpected characters reaching ImageKit (only
 * `a-z A-Z 0-9 . - _ /` are allowed there).
 */
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/** Maps an ImageKit failure onto an error that is safe to show to the citizen. */
const toImageUploadError = (error: unknown): AppError => {
  if (error instanceof APIConnectionTimeoutError) {
    return new InternalServerError('Image upload timed out, please try again', 'IMAGE_UPLOAD_TIMEOUT');
  }

  if (error instanceof APIConnectionError) {
    return new InternalServerError('Image upload service is unreachable, please try again', 'IMAGE_UPLOAD_UNREACHABLE');
  }

  if (error instanceof AuthenticationError) {
    // A misconfigured .env. The details stay server side; the citizen is never
    // told that credentials were rejected.
    return new InternalServerError('Image upload is not available right now', 'IMAGE_UPLOAD_UNAVAILABLE');
  }

  if (error instanceof APIError) {
    return new BadRequestError('The image could not be processed', 'IMAGE_REJECTED');
  }

  return new InternalServerError('Image upload failed, please try again', 'IMAGE_UPLOAD_FAILED');
};

/**
 * Uploads one citizen photo to ImageKit and returns the reference to store on
 * the issue. `file.buffer` is the in-memory copy multer produced.
 */
export const uploadIssueImage = async (file: UploadedImageFile): Promise<IssueImageUpload> => {
  const extension = EXTENSION_BY_MIME_TYPE[file.mimetype];

  if (!extension) {
    throw new BadRequestError('Unsupported image type', 'UNSUPPORTED_IMAGE_TYPE');
  }

  // Node 20+ exposes a global File, which is the upload type the SDK expects.
  // multer buffers into a Node Buffer, which is a Uint8Array view that may sit
  // on a SharedArrayBuffer; copying it into a plain Uint8Array gives the SDK the
  // ArrayBuffer backed view its `BlobPart` type requires.
  const bytes = new Uint8Array(file.buffer);
  const payload = new File([bytes], `issue-${randomUUID()}${extension}`, { type: file.mimetype });

  let uploaded: { url?: string; fileId?: string };

  try {
    uploaded = await imageKitClient.files.upload({
      file: payload,
      fileName: payload.name,
      folder: ISSUE_IMAGE_FOLDER,
      useUniqueFileName: true,
      tags: ['climate-smart-city', 'citizen-issue'],
    });
  } catch (error) {
    // Log the reason (never the credentials) and return a sanitised error.
    logger.error('ImageKit upload failed', {
      reason: error instanceof Error ? error.message : 'unknown error',
      fileSize: file.size,
      mimetype: file.mimetype,
    });

    throw toImageUploadError(error);
  }

  if (!uploaded.url || !uploaded.fileId) {
    logger.error('ImageKit upload returned an incomplete response', {
      hasUrl: Boolean(uploaded.url),
      hasFileId: Boolean(uploaded.fileId),
    });

    throw new InternalServerError('Image upload failed, please try again', 'IMAGE_UPLOAD_INCOMPLETE');
  }

  return { imageUrl: uploaded.url, imageFileId: uploaded.fileId };
};
