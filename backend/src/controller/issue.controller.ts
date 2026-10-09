import type { Request, RequestHandler, Response } from 'express';
import type { UploadedImageFile } from '../models/issue.model.js';
import { ISSUE_IMAGE_FIELD } from '../middleware/upload.middleware.js';
import * as issueService from '../service/issue.service.js';
import type { CreateIssueRequest } from '../validation/issue.schema.js';
import { BadRequestError, UnauthorizedError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import { deleteIssue } from '../dao/issue.dao.js';
/**
 * HTTP layer for citizen issue reports.
 *
 * - Reads the authenticated user from `req.user` (set by `authenticate`).
 * - Reads the parsed body (set by `validateBody` after Zod validation).
 * - If a photo was attached, `req.file` is the in-memory buffer from multer.
 * - Delegates to the service, returns the response envelope.
 *
 * This controller remains thin by design. No SQL, no ImageKit, no validation
 * logic here - only request/response mapping.
 */

/** Maps multer's in-memory upload onto the shape the service layer expects. */
const toImageFile = (file: Express.Multer.File): UploadedImageFile => ({
  buffer: file.buffer,
  originalname: file.originalname,
  mimetype: file.mimetype,
  size: file.size,
});

const createIssueHandler: RequestHandler<
  Record<string, string>,
  unknown,
  CreateIssueRequest
> = async (req: Request<Record<string, string>, unknown, CreateIssueRequest>, res: Response) => {
  if (!req.user) {
    // Unreachable while mounted behind `authenticate`, but kept as a guard.
    throw new UnauthorizedError('Authentication required', 'MISSING_TOKEN');
  }

  const imageFile = req.file ? toImageFile(req.file) : null;

  const issue = await issueService.createIssue({
    userId: req.user.userId,
    body: req.body,
    imageFile,
  });

  sendSuccess(res, 201, 'Issue reported successfully', { issue });
};

const listMyIssuesHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    // Unreachable while mounted behind `authenticate`, but kept as a guard.
    throw new UnauthorizedError('Authentication required', 'MISSING_TOKEN');
  }

  const issues = await issueService.listIssuesForUser(req.user.userId);

  sendSuccess(res, 200, 'My issues retrieved', { issues });
};

/**
 * Uploads a photo on its own and hands back the reference for
 * `POST /api/issues`. The returned field names are exactly the ones the create
 * endpoint accepts, so the client can pass them straight through.
 */
const uploadIssuePhotoHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    // Unreachable while mounted behind `authenticate`, but kept as a guard.
    throw new UnauthorizedError('Authentication required', 'MISSING_TOKEN');
  }

  if (!req.file) {
    throw new BadRequestError(
      `No image was attached. Send the photo in the "${ISSUE_IMAGE_FIELD}" field`,
      'IMAGE_REQUIRED',
    );
  }

  const image = await issueService.uploadIssuePhoto(toImageFile(req.file));

  sendSuccess(res, 201, 'Image uploaded successfully', {
    imageUrl: image.imageUrl,
    imageFileId: image.imageFileId,
  });
};
export const deleteIssueHandler: RequestHandler<{ id: string }> = async (req, res) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required', 'MISSING_TOKEN');
  }

  const issueId = req.params.id;

  // Optionally, you could check if the issue belongs to the user before deleting
  // const issue = await issueService.findIssueById(issueId);
  // if (!issue || issue.userId !== req.user.userId) {
  //   throw new UnauthorizedError('You do not have permission to delete this issue', 'FORBIDDEN');
  // }

  await deleteIssue(issueId);

  sendSuccess(res, 200, 'Issue deleted successfully', { issueId });
};  



export const createIssue = asyncHandler(createIssueHandler);
export const listMyIssues = asyncHandler(listMyIssuesHandler);
export const uploadIssuePhoto = asyncHandler(uploadIssuePhotoHandler);
