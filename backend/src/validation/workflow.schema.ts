import { z } from 'zod';
import { issueIdSchema } from './admin-issue.schema.js';

/**
 * Request schemas for the assignment + authority workflow endpoints.
 *
 * As with the admin review schemas, the client never chooses a status: each
 * transition is its own endpoint and the resulting status is a server-side
 * constant, so `status` fields are rejected rather than ignored. Identities
 * (assigner, assignee, task owner) come from the JWT cookie / path, never
 * from freely chosen body fields - except `authorityId`, which the admin
 * explicitly picks from the workforce list.
 */

/** POST /api/admin/issues/:issueId/assign body: which AUTHORITY gets the task. */
export const assignIssueSchema = z
  .object({
    authorityId: issueIdSchema,
  })
  .strict();

/** PATCH /api/authority/issues/:issueId/resolve body: optional field note. */
export const resolveIssueSchema = z.preprocess(
  (value) => (value === undefined || value === null ? {} : value),
  z
    .object({
      note: z
        .string({ error: 'Note must be a string' })
        .trim()
        .min(1, 'Note cannot be blank')
        .max(1000, 'Note must be at most 1000 characters')
        .optional(),
    })
    .strict(),
);

export type AssignIssueRequest = z.infer<typeof assignIssueSchema>;
export type ResolveIssueRequest = z.infer<typeof resolveIssueSchema>;
