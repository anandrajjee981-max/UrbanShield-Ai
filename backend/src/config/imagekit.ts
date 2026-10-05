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
 * The reference stored for an uploaded government identity document.
 *
 * Carries `mimeType` as well because the stored document type is what an admin
 * review screen shows next to the file, and re-deriving it from the URL or the
 * filename would mean trusting a client supplied string.
 */
export interface AuthorityDocumentUpload {
  documentUrl: string;
  documentFileId: string;
  mimeType: string;
}

/** Hard limit for one identity document, enforced before the upload starts. */
export const AUTHORITY_DOCUMENT_MAX_BYTES = env.AUTHORITY_DOCUMENT_MAX_BYTES;

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
 * Government identity documents live in their own folder, separate from public
 * issue photos.
 *
 * Two reasons it is not just another subfolder of ISSUE_IMAGE_FOLDER: the files
 * are uploaded with `isPrivateFile`, and keeping them apart means a future "purge
 * old report photos" sweep can never be pointed at the wrong directory.
 */
export const AUTHORITY_DOCUMENT_FOLDER = '/climate-smart-city/authority-documents';

/**
 * ImageKit tags applied to every identity document.
 *
 * The `sensitive` tag is what makes these files findable in the ImageKit
 * dashboard for a later retention or deletion sweep - it is the one place where
 * "these are not ordinary uploads" has to be visible.
 */
export const AUTHORITY_DOCUMENT_TAGS = ['climate-smart-city', 'authority-verification', 'sensitive'];

/** Extension per accepted document mime type, derived server-side (see authority-document.service.ts). */
export const AUTHORITY_DOCUMENT_EXTENSIONS: Readonly<Record<string, string>> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

/**
 * The URL endpoint belongs to the URL-building helper, not the client options in
 * ImageKit v7. Keep it in one place so the app can build signed or transformed
 * asset URLs when needed.
 */
export const IMAGEKIT_URL_ENDPOINT = env.IMAGEKIT_URL_ENDPOINT;

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
