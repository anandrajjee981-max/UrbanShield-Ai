import * as issueDao from '../dao/issue.dao.js';
import { triggerWorkflow } from '../ai/services/workflow.service.js';
import type { IssueImageUpload } from '../config/imagekit.js';
import * as imageService from './image.service.js';
import type { CreateIssueData, Issue, SafeIssue, UploadedImageFile } from '../models/issue.model.js';
import { toSafeIssue } from '../models/issue.model.js';
import { INITIAL_ISSUE_STATUS } from '../types/issue.types.js';
import type { CreateIssueRequest } from '../validation/issue.schema.js';
import { createIssueSchema } from '../validation/issue.schema.js';
import { BadRequestError, InternalServerError } from '../utils/api-error.js';

/**
 * Business layer for citizen issue reports.
 *
 * Responsibilities:
 *  - Re-parse the request with `createIssueSchema` (defensive: keeps the
 *    service safe when it is called from outside the HTTP boundary, e.g. a
 *    future admin tool or a queued job)
 *  - Enforce the location rules - the schema is a discriminated union on
 *    `locationType`, so GPS coordinates and a manual address are mutually
 *    exclusive and coordinates are range checked
 *  - Resolve the photo, which may arrive as a multipart file or as a URL
 *    produced by the standalone upload endpoint
 *  - Prepare `CreateIssueData` and persist it via the DAO
 *  - Return a `SafeIssue`, the only shape allowed to reach a response
 *
 * Status policy: a citizen can only create an issue as `REPORTED`. That value
 * is never read from the request (the schema is `.strict()`, so a `status` field
 * is a 400) and the DAO leaves the column to its `DEFAULT 'REPORTED'`. The
 * assertion below is the last line of defence, so a future change that starts
 * passing a status through cannot silently let a citizen mark their own issue
 * VERIFIED.
 */

export interface CreateIssueParams {
  /** Authenticated citizen id, from `req.user.userId`. Never from the body. */
  userId: string;
  body: CreateIssueRequest;
  /**
   * The in-memory photo produced by the `uploadIssueImage` middleware, if one
   * was attached. Forwarded to ImageKit; never written to disk or PostgreSQL.
   */
  imageFile?: UploadedImageFile | null;
}

/** Ceiling for "My Reports" so one account cannot force an unbounded scan. */
const MAX_LIST_LIMIT = 100;

/**
 * The photo reference that ends up on the issue. The URL is always present when
 * this exists; the ImageKit file id is not, because a client is allowed to send
 * an `imageUrl` on its own.
 */
interface ResolvedImage {
  imageUrl: string;
  imageFileId: string | null;
}

/**
 * Works out the photo reference for a new issue.
 *
 * A photo can reach the API two ways, and the caller must pick exactly one:
 *
 *  - a `multipart/form-data` file part named `image` on the create request
 *    itself, uploaded to ImageKit right here
 *  - an `imageUrl` (plus the `imageFileId` that came with it) returned earlier
 *    by `POST /api/issues/upload`, so a client can upload the photo first and
 *    then create the issue with a plain JSON body
 *
 * Supplying both is rejected instead of silently preferring one, otherwise a
 * client that mixes the two modes would store a photo the citizen never picked.
 */
const resolveImageReference = async (
  imageFile: UploadedImageFile | null | undefined,
  payload: Pick<CreateIssueRequest, 'imageUrl' | 'imageFileId'>,
): Promise<ResolvedImage | null> => {
  if (imageFile && payload.imageUrl) {
    throw new BadRequestError(
      'Attach the photo either as a multipart "image" file or as an imageUrl, not both',
      'IMAGE_SOURCE_CONFLICT',
    );
  }

  if (imageFile) {
    return imageService.uploadIssueImage(imageFile);
  }

  if (payload.imageUrl) {
    // Already validated as an http(s) URL by the schema. The file id was
    // validated as a well formed ImageKit id, and the schema rejects it when the
    // URL is missing, so this pair is always complete.
    return { imageUrl: payload.imageUrl, imageFileId: payload.imageFileId ?? null };
  }

  return null;
};

export const createIssue = async (params: CreateIssueParams): Promise<SafeIssue> => {
  const { userId, body, imageFile } = params;

  // Throws a ZodError, which the error middleware maps to a 400 with details.
  const payload = createIssueSchema.parse(body);

  const image = await resolveImageReference(imageFile, payload);

  const data: CreateIssueData = {
    userId,
    issueType: payload.issueType,
    description: payload.description,
    imageUrl: image?.imageUrl ?? null,
    imageFileId: image?.imageFileId ?? null,
    locationType: payload.locationType,
    latitude: payload.locationType === 'GPS' ? payload.latitude : null,
    longitude: payload.locationType === 'GPS' ? payload.longitude : null,
    address: payload.locationType === 'MANUAL' ? payload.address : null,
  };

  const issue: Issue = await issueDao.createIssue(data);

  if (issue.status !== INITIAL_ISSUE_STATUS) {
    // Unreachable: the DAO does not insert a status and the column defaults to
    // REPORTED. Reported as a 500 because it is our bug, not the caller's.
    throw new InternalServerError('Issue was created with an unexpected status', 'UNEXPECTED_ISSUE_STATUS');
  }

  // Background AI workflow: Watcher -> Boss -> Assignment, with failure
  // recovery (an AI failure creates an admin work item and never rejects the
  // issue). Deliberately fire-and-forget - the response above is already
  // decided by the row, so a slow or dead AI provider can neither delay nor
  // fail a citizen's report.
  triggerWorkflow(issue.id);

  return toSafeIssue(issue);
};

/**
 * Uploads a photo without creating an issue, returning the reference the
 * citizen then sends as `imageUrl` when reporting (`POST /api/issues/upload`).
 *
 * The image bytes still never touch PostgreSQL - only the URL and the file id
 * come back, and the issue only points at them once it is created.
 */
export const uploadIssuePhoto = async (imageFile: UploadedImageFile): Promise<IssueImageUpload> =>
  imageService.uploadIssueImage(imageFile);

/**
 * Every issue reported by the authenticated user, newest first. The `userId`
 * filter is applied in SQL by the DAO, so a caller cannot widen the result set
 * and a `userId` query parameter is simply ignored.
 */
export const listIssuesForUser = async (userId: string, limit = MAX_LIST_LIMIT): Promise<SafeIssue[]> => {
  const issues = await issueDao.findIssuesByUserId(userId, Math.max(1, Math.min(limit, MAX_LIST_LIMIT)));

  return issues.map(toSafeIssue);
};
