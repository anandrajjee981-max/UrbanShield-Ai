import ImageKit from '@imagekit/nodejs';
import { env } from './env.js';

/**
 * Single source of truth for the ImageKit integration used by citizen issue
 * photos.
 *
 * The credentials live in `env` and are read here and nowhere else, so there is
 * exactly one place that could leak them. Only `privateKey` authenticates the
 * server side upload; the public key is validated in config/env.ts but is not
 * needed for it, and neither key is ever returned in an API response.
 */

export interface IssueImageUpload {
  imageUrl: string;
  imageFileId: string;
}

/**
 * Every citizen upload lands in this ImageKit folder so reports can be listed
 * or purged later. ImageKit creates missing folders automatically.
 */
export const ISSUE_IMAGE_FOLDER = '/climate-smart-city/issues';

/** Image types a citizen may attach to a report. */
export const ISSUE_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Hard limit applied by multer before a single byte is read from the socket. */
export const ISSUE_IMAGE_MAX_BYTES = env.ISSUE_IMAGE_MAX_BYTES;

/**
 * Shared ImageKit client. Uploads fail fast instead of retrying for a long time:
 * a citizen is waiting on the response, and a retry of a large body would only
 * hold the connection open longer.
 */
export const imageKitClient = new ImageKit({
  privateKey: env.IMAGEKIT_PRIVATE_KEY,
  timeout: 20_000,
  maxRetries: 1,
});
