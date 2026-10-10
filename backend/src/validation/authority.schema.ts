import { z } from 'zod';
import {
  ADMIN_FILTERABLE_AUTHORITY_STATUSES,
  AUTHORITY_AVAILABILITIES,
  AUTHORITY_DEPARTMENTS,
  AUTHORITY_DESIGNATIONS,
  AUTHORITY_JURISDICTION_TYPES,
  AUTHORITY_SKILLS,
  GOVERNMENT_ID_TYPES,
} from '../types/authority.types.js';

/**
 * Request schemas for the authority verification endpoints
 * (`/api/authority/...` and `/api/admin/authority-applications/...`).
 *
 * Three ideas run through all of them:
 *
 *  - The client never chooses the status, the reviewer, or the applicant. Each
 *    transition is its own endpoint and the resulting status is a server side
 *    constant (AUTHORITY_STATUS_AFTER_ADMIN_ACTION), so `verificationStatus`,
 *    `status`, `isVerified`, `role`, `userId`, `verifiedBy` and `adminId` are
 *    rejected by the `.strict()` objects below rather than silently ignored. That
 *    is the second line of defence; the DAO's `WHERE ... AND
 *    verification_status = 'PENDING'` is the first.
 *
 *  - The reviewer identity is never part of a request. It comes from
 *    `req.user.userId`, set by `authenticate` from the JWT cookie.
 *
 *  - `multipart/form-data` delivers every text field as a string, so numbers are
 *    coerced and blank strings are normalised to `undefined` *before* the checks.
 *    Without that, `Number('')` is `0`, which would pass a range check as a valid
 *    value.
 */

/** Matches the widths of the `authority_applications` VARCHAR columns. */
export const AUTHORITY_FULL_NAME_MAX_LENGTH = 120;
export const AUTHORITY_PHONE_MAX_LENGTH = 20;
export const AUTHORITY_EMAIL_MAX_LENGTH = 320;
export const AUTHORITY_ADDRESS_MAX_LENGTH = 500;
export const AUTHORITY_JURISDICTION_MAX_LENGTH = 200;
export const AUTHORITY_REJECTION_REASON_MAX_LENGTH = 500;
/** Matches `government_id_number` (VARCHAR(64)), the widest a mask needs to be. */
export const GOVERNMENT_ID_MAX_LENGTH = 64;

/** Ceiling for one admin queue page. */
export const ADMIN_AUTHORITY_LIST_MAX_LIMIT = 100;

/**
 * Minimum phone length in digits, after separators are stripped: the shortest
 * form of an Indian mobile number, which is the shortest this product accepts.
 */
const MIN_PHONE_DIGITS = 10;
const MAX_PHONE_DIGITS = 15;

/** Lowest age an applicant may be; mirrors the DB CHECK in migration 004. */
const MIN_APPLICANT_AGE_YEARS = 18;
const MAX_APPLICANT_AGE_YEARS = 100;

/**
 * `multipart/form-data` turns every text field into a string, and an omitted
 * field arrives as `''`. Blank is turned into `undefined` first so that
 * `phone=''` is a "missing field" rather than a value that passes a numeric
 * check.
 */
const trimmedOrUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

/**
 * A date of birth the applicant can actually hold the role at: a real calendar
 * date, in the past, between {@link MIN_APPLICANT_AGE_YEARS} and
 * {@link MAX_APPLICANT_AGE_YEARS}.
 *
 * Parsed rather than range-compared as a string, so `1990-02-31` is rejected
 * instead of being stored as a date PostgreSQL would then have to reinterpret.
 */
const dateOfBirth = z
  .string({ error: 'Date of birth is required' })
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(1, 'Date of birth is required')
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        'Date of birth must be in YYYY-MM-DD format',
      )
      .refine((value) => {
        const parsed = new Date(`${value}T00:00:00.000Z`);

        if (Number.isNaN(parsed.getTime())) return false;

        // Reject a syntactically valid but nonexistent date such as 1990-02-31,
        // which Date would silently roll over into March.
        return parsed.toISOString().slice(0, 10) === value;
      }, 'Date of birth must be a real calendar date')
      .refine((value) => {
        const ageYears =
          (Date.now() - new Date(`${value}T00:00:00.000Z`).getTime()) /
          (365.2425 * 24 * 60 * 60 * 1000);

        return ageYears >= MIN_APPLICANT_AGE_YEARS && ageYears <= MAX_APPLICANT_AGE_YEARS;
      }, `Applicant must be between ${MIN_APPLICANT_AGE_YEARS} and ${MAX_APPLICANT_AGE_YEARS} years old`)
      .max(10, 'Date of birth must be in YYYY-MM-DD format'),
  );

/**
 * Contact number, normalised to bare digits.
 *
 * Spaces, dashes, brackets and a leading `+91` are stripped so the stored column
 * holds digits only - which is what lets the database CHECK
 * (`authority_applications_phone_digits`) and any future OTP delivery treat it as
 * a number. The length range is inclusive of the shortest and longest forms an
 * Indian number takes.
 */
const phoneNumber = z
  .string({ error: 'Phone number is required' })
  .transform((value) => value.replace(/[\s\-()+]/g, ''))
  .refine(
    (value) => new RegExp(`^[0-9]{${MIN_PHONE_DIGITS},${MAX_PHONE_DIGITS}}$`).test(value),
    `Phone number must be ${MIN_PHONE_DIGITS}-${MAX_PHONE_DIGITS} digits`,
  );

/**
 * Contact email, lower cased.
 *
 * Lower casing here is not cosmetic: the database CHECK
 * `authority_applications_email_lowercase` requires the stored value to equal its
 * own `LOWER()`, so an un-normalised value would fail the insert with a 400 that
 * says nothing useful.
 */
const contactEmail = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .email('A valid email address is required')
  .max(AUTHORITY_EMAIL_MAX_LENGTH, `Email must be at most ${AUTHORITY_EMAIL_MAX_LENGTH} characters`);

/**
 * The government identity number.
 *
 * Normalised the same way as the mask in src/utils/mask.ts: separators are
 * stripped so `1234 5678 9012` and `123456789012` are the same stored value, and
 * the mask cannot be defeated by typing spaces between the digits.
 *
 * The alphabet is alphanumeric rather than digits-only on purpose - `AADHAAR`
 * wants 12 digits, but `GOVERNMENT_ID` and `OTHER` cover passport numbers, driving
 * licences and employee ids, which contain letters. Length is bounded at both
 * ends: too short is not a real document number, and the upper bound keeps the
 * masked value narrow.
 */
const governmentIdNumber = z
  .string({ error: 'Government ID number is required' })
  .transform((value) => value.replace(/[\s-]+/g, ''))
  .refine(
    (value) => value.length >= 8,
    'Government ID number must be at least 8 characters',
  )
  .refine(
    (value) => value.length <= GOVERNMENT_ID_MAX_LENGTH,
    `Government ID number must be at most ${GOVERNMENT_ID_MAX_LENGTH} characters`,
  )
  .refine(
    (value) => /^[A-Za-z0-9]+$/.test(value),
    'Government ID number must contain only letters and digits',
  );

/**
 * `POST /api/authority/application` (and re-submission to the same endpoint).
 *
 * `.strict()` is the important part: a client posting `verificationStatus`,
 * `status`, `role`, `isVerified`, `userId`, `submittedAt`, `verifiedBy` or
 * `adminId` gets a 400 naming the offending field, instead of the value being
 * ignored while the applicant believes it took effect.
 */
export const submitAuthorityApplicationSchema = z
  .object({
    // ------------------------------------------------------ personal details
    fullName: z
      .string({ error: 'Full name is required' })
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(AUTHORITY_FULL_NAME_MAX_LENGTH, `Full name must be at most ${AUTHORITY_FULL_NAME_MAX_LENGTH} characters`),
    dateOfBirth,
    phone: phoneNumber,
    email: contactEmail,
    address: z
      .string()
      .trim()
      .max(AUTHORITY_ADDRESS_MAX_LENGTH, `Address must be at most ${AUTHORITY_ADDRESS_MAX_LENGTH} characters`)
      .default(''),

    // --------------------------------------------- government identity
    governmentIdType: z.enum(GOVERNMENT_ID_TYPES, {
      error: `Government ID type must be one of: ${GOVERNMENT_ID_TYPES.join(', ')}`,
    }),
    governmentIdNumber,

    // -------------------------------------------- professional information
    department: z.enum(AUTHORITY_DEPARTMENTS, {
      error: `Department must be one of: ${AUTHORITY_DEPARTMENTS.join(', ')}`,
    }),
    designation: z.enum(AUTHORITY_DESIGNATIONS, {
      error: `Designation must be one of: ${AUTHORITY_DESIGNATIONS.join(', ')}`,
    }),
    /**
     * The one field a client cannot send as a repeated multipart key without the
     * server deciding how to read it. Over `multipart/form-data` a multi-select
     * arrives either as a comma separated string (`skills=PLUMBING,WATER_QUALITY`,
     * which is what a plain HTML `<select multiple>` and every JS form serialiser
     * produce) or as a JSON array string when the value is `JSON.stringify`d. Both
     * are normalised to an array here, and a genuinely repeated key - which Multer
     * already collapses into an array - is used as is.
     *
     * Deduplicated, so a client that lists the same skill twice cannot store two
     * identical rows (the primary key would reject it with a driver level
     * duplicate-key error and a confusing 409). Non-empty because an authority
     * with no declared skills cannot be matched to anything later.
     */
    skills: z.preprocess(
      (value) => {
        const asList = (input: unknown): unknown => {
          if (Array.isArray(input)) return input;

          if (typeof input !== 'string') return input;

          const trimmed = input.trim();

          if (trimmed === '') return [];

          // A JSON array is how a fetch() client sends the list.
          if (trimmed.startsWith('[')) {
            try {
              const parsed: unknown = JSON.parse(trimmed);
              return Array.isArray(parsed) ? parsed : input;
            } catch {
              return input;
            }
          }

          return trimmed.split(',');
        };

        const list = asList(value);

        if (!Array.isArray(list)) return list;

        // Trim each entry and drop blanks, so "A,,B" and " A , B " both mean two
        // skills, and drop case differences that would otherwise fail the enum
        // check with a confusing message about skill casing.
        return [...new Set(list.map((entry) => (typeof entry === 'string' ? entry.trim() : entry)).filter((entry) => entry !== ''))];
      },
      z
        .array(z.enum(AUTHORITY_SKILLS, { error: `Skill must be one of: ${AUTHORITY_SKILLS.join(', ')}` }))
        .min(1, 'At least one skill is required')
        .max(AUTHORITY_SKILLS.length, `At most ${AUTHORITY_SKILLS.length} skills can be selected`),
    ),
    jurisdictionType: z.enum(AUTHORITY_JURISDICTION_TYPES, {
      error: `Jurisdiction type must be one of: ${AUTHORITY_JURISDICTION_TYPES.join(', ')}`,
    }),
    jurisdictionName: z
      .string({ error: 'Jurisdiction name is required' })
      .trim()
      .min(1, 'Jurisdiction name is required')
      .max(
        AUTHORITY_JURISDICTION_MAX_LENGTH,
        `Jurisdiction name must be at most ${AUTHORITY_JURISDICTION_MAX_LENGTH} characters`,
      ),

    /**
     * Optional, and defaulted to AVAILABLE. Accepted now because it is part of the
     * profile the assignment engine will read; there is no endpoint that changes it
     * later yet, and nothing here invents workload data.
     */
    availability: z.preprocess(
      trimmedOrUndefined,
      z.enum(AUTHORITY_AVAILABILITIES, {
        error: `Availability must be one of: ${AUTHORITY_AVAILABILITIES.join(', ')}`,
      }).default(AUTHORITY_AVAILABILITIES[0]),
    ),
  })
  .strict();

/**
 * `GET /api/admin/authority-applications` query string.
 *
 * Without `status` the queue lists every application, newest submission first.
 * `.strict()` so a typo such as `?state=PENDING` cannot silently return the
 * unfiltered list - which matters here, because "the unfiltered list" still
 * contains every candidate's personal data.
 */
export const adminAuthorityListQuerySchema = z
  .object({
    /**
     * Optional, because an admin opening the queue usually wants everything, newest
     * first. When it *is* supplied it must be a real status - the service turns
     * absence into an explicit "no filter" rather than a default status, so an
     * unfiltered list is always a deliberate act.
     */
    status: z
      .preprocess(
        trimmedOrUndefined,
        z.enum(ADMIN_FILTERABLE_AUTHORITY_STATUSES, {
          error: `Status must be one of: ${ADMIN_FILTERABLE_AUTHORITY_STATUSES.join(', ')}`,
        }),
      )
      .optional(),
    /** Optional, and capped here so a client cannot ask for the whole table. */
    limit: z.preprocess(
      trimmedOrUndefined,
      z.coerce
        .number({ error: 'Limit must be a number' })
        .int('Limit must be a whole number')
        .min(1, 'Limit must be at least 1')
        .max(
          ADMIN_AUTHORITY_LIST_MAX_LIMIT,
          `Limit must be at most ${ADMIN_AUTHORITY_LIST_MAX_LIMIT}`,
        ),
    ).optional(),
  })
  .strict();

/** `:applicationId` path parameter. */
export const authorityApplicationIdSchema = z.uuid('Application id must be a valid UUID');

/**
 * `PATCH /api/admin/authority-applications/:applicationId/verify` body.
 *
 * An empty, strict object: the endpoint alone decides that a PENDING application
 * becomes VERIFIED, so `{}` and no body at all are both accepted while anything
 * the client tries to dictate is a 400 even for an admin.
 *
 * The preprocessor normalises the missing body, because `express.json()` leaves
 * `req.body` undefined for a request without a JSON body.
 */
export const verifyAuthorityApplicationSchema = z.preprocess(
  (value) => (value === undefined || value === null ? {} : value),
  z.object({}).strict(),
);

/**
 * `PATCH /api/admin/authority-applications/:applicationId/reject` body.
 *
 * `reason` is optional - rejecting without an explanation is allowed - but a
 * reason that is present must be real text: it is trimmed first, so a
 * whitespace-only value becomes an empty string and is rejected instead of being
 * stored as a blank message the candidate would see.
 */
export const rejectAuthorityApplicationSchema = z.preprocess(
  (value) => (value === undefined || value === null ? {} : value),
  z
    .object({
      reason: z
        .string({ error: 'Reason must be a string' })
        .trim()
        .min(1, 'Reason cannot be blank')
        .max(
          AUTHORITY_REJECTION_REASON_MAX_LENGTH,
          `Reason must be at most ${AUTHORITY_REJECTION_REASON_MAX_LENGTH} characters`,
        )
        .optional(),
    })
    .strict(),
);

export type SubmitAuthorityApplicationRequest = z.infer<typeof submitAuthorityApplicationSchema>;
export type AdminAuthorityListQuery = z.infer<typeof adminAuthorityListQuerySchema>;
export type VerifyAuthorityApplicationRequest = z.infer<typeof verifyAuthorityApplicationSchema>;
export type RejectAuthorityApplicationRequest = z.infer<typeof rejectAuthorityApplicationSchema>;