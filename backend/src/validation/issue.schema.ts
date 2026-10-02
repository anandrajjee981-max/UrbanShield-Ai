import { z } from 'zod';
import { ISSUE_TYPES, LOCATION_TYPES } from '../types/issue.types.js';

/**
 * Issue request schemas. Validation runs in the `validateBody` middleware so the
 * controller receives data that already matches these types, and the service
 * layer parses again so it stays safe when called from anywhere else.
 *
 * The schema is a discriminated union on `locationType`, which is what makes the
 * two location modes mutually exclusive:
 *
 * - `GPS`    requires `latitude` and `longitude` and forbids `address`
 * - `MANUAL` requires `address` and forbids coordinates
 *
 * Anything else - an unknown `locationType`, `GPS` without coordinates, an
 * out of range latitude, a mix of both modes - fails here with a 400 before a
 * service, a DAO or ImageKit is reached. `status` and `userId` are absent on
 * purpose: `.strict()` rejects them, so a citizen cannot post their own id or
 * claim the issue is already VERIFIED.
 *
 * Photos have two equivalent ways in, and the client picks one:
 *
 * - a `multipart/form-data` file part named `image`, uploaded while the issue
 *   is created
 * - an `imageUrl` (+ its `imageFileId`) previously returned by
 *   `POST /api/issues/upload`, which lets a client upload the photo first and
 *   then create the issue with a plain JSON body
 */

export const ISSUE_DESCRIPTION_MAX_LENGTH = 2000;
export const ISSUE_ADDRESS_MAX_LENGTH = 500;
/** Matches the width of `issues.image_url` (VARCHAR(1000)). */
export const ISSUE_IMAGE_URL_MAX_LENGTH = 1000;
/** Matches the width of `issues.image_file_id` (VARCHAR(255)). */
export const ISSUE_IMAGE_FILE_ID_MAX_LENGTH = 255;

/**
 * Coordinates must be numbers inside the real geographic range, which is what
 * makes an issue usable for map routing later:
 *
 *   latitude  -90 .. 90
 *   longitude -180 .. 180
 */
const MIN_LATITUDE = -90;
const MAX_LATITUDE = 90;
const MIN_LONGITUDE = -180;
const MAX_LONGITUDE = 180;

/**
 * `multipart/form-data` delivers every text field as a string, so numbers are
 * coerced. A blank form field is turned into `undefined` first: `Number('')`
 * is `0`, which would otherwise be accepted as a valid latitude of zero.
 * Zod's `z.number()` already rejects `NaN` and `Infinity`, so a non numeric
 * value can never slip through the range check.
 */
const coordinate = (label: string, min: number, max: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.coerce
      .number({ error: `${label} is required and must be a number` })
      .min(min, `${label} must be between ${min} and ${max}`)
      .max(max, `${label} must be between ${min} and ${max}`),
  );

/**
 * `multipart/form-data` delivers every text field as a string, so an omitted
 * optional field can arrive as `''`. Blank is normalised to `undefined` (so
 * `imageUrl=''` means "no photo" rather than a failed URL check) and the
 * remaining value is trimmed here, before the checks, so the value that gets
 * validated is the value that gets stored.
 */
const trimmedOrUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

/**
 * The URL ImageKit returned for the photo. `z.url` with a protocol pattern is
 * a single check, so an unparseable value is rejected as a 400 instead of
 * reaching the protocol test. Only http(s) is accepted: the value is stored and
 * later rendered back to officers, so a `javascript:` or `data:` URL must never
 * reach the database.
 */
const imageUrlField = z.preprocess(
  trimmedOrUndefined,
  z
    .url({ protocol: /^https?$/, error: 'imageUrl must be a valid http or https URL' })
    .max(ISSUE_IMAGE_URL_MAX_LENGTH, `imageUrl must be at most ${ISSUE_IMAGE_URL_MAX_LENGTH} characters`)
    .optional(),
);

/**
 * ImageKit file ids are opaque, so only the characters ImageKit itself emits
 * are allowed. This keeps a free text value out of a column that is later used
 * to build an ImageKit API call.
 */
const imageFileIdField = z.preprocess(
  trimmedOrUndefined,
  z
    .string()
    .max(ISSUE_IMAGE_FILE_ID_MAX_LENGTH, `imageFileId must be at most ${ISSUE_IMAGE_FILE_ID_MAX_LENGTH} characters`)
    .regex(/^[A-Za-z0-9_-]+$/, 'imageFileId must contain only letters, digits, hyphens or underscores')
    .optional(),
);

/** Fields shared by both location modes. */
const issueShape = {
  issueType: z.enum(ISSUE_TYPES, {
    error: `Issue type must be one of: ${ISSUE_TYPES.join(', ')}`,
  }),
  /**
   * The citizen's own words, stored verbatim. Nothing rewrites or summarises
   * the text at this stage, so it is only trimmed and length checked.
   */
  description: z
    .string({ error: 'Description is required' })
    .trim()
    .min(1, 'Description is required')
    .max(ISSUE_DESCRIPTION_MAX_LENGTH, `Description must be at most ${ISSUE_DESCRIPTION_MAX_LENGTH} characters`),
  /**
   * Photo reference produced by `POST /api/issues/upload`, accepted instead of a
   * multipart file. Both fields are optional because an issue may be reported
   * without a photo, in which case the columns stay null.
   */
  imageUrl: imageUrlField,
  /**
   * The ImageKit file id that came back with `imageUrl`. Kept so a stored photo
   * can be replaced or deleted later without parsing the URL.
   */
  imageFileId: imageFileIdField,
};

/**
 * "Track my location": the browser (not the server) resolves the GPS fix and
 * sends the resulting coordinates.
 */
const gpsLocationShape = z
  .object({
    ...issueShape,
    locationType: z.literal(LOCATION_TYPES[0]),
    latitude: coordinate('Latitude', MIN_LATITUDE, MAX_LATITUDE),
    longitude: coordinate('Longitude', MIN_LONGITUDE, MAX_LONGITUDE),
  })
  .strict();

/**
 * "Enter location manually": the citizen types an address. No geocoding is
 * attempted, so `latitude`/`longitude` stay null and the address is the only
 * location the report carries.
 */
const manualLocationShape = z
  .object({
    ...issueShape,
    locationType: z.literal(LOCATION_TYPES[1]),
    address: z
      .string({ error: 'Address is required when locationType is MANUAL' })
      .trim()
      .min(1, 'Address is required when locationType is MANUAL')
      .max(ISSUE_ADDRESS_MAX_LENGTH, `Address must be at most ${ISSUE_ADDRESS_MAX_LENGTH} characters`),
  })
  .strict();

export const createIssueSchema = z
  .discriminatedUnion('locationType', [gpsLocationShape, manualLocationShape])
  .superRefine((issue, ctx) => {
    // A file id without its URL is a half finished reference: storing it would
    // leave a column that no photo can be matched against.
    if (issue.imageFileId !== undefined && issue.imageUrl === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['imageFileId'],
        message: 'imageFileId is only accepted together with imageUrl',
      });
    }
  });

export type CreateIssueRequest = z.infer<typeof createIssueSchema>;
export type GpsIssueRequest = Extract<CreateIssueRequest, { locationType: 'GPS' }>;
export type ManualIssueRequest = Extract<CreateIssueRequest, { locationType: 'MANUAL' }>;
