import { z } from 'zod';

/**
 * Request schemas for the Authority "My Tasks" module + Admin manual assign:
 *   GET   /api/authority/tasks
 *   GET   /api/authority/tasks/:taskId
 *   PATCH /api/authority/tasks/:taskId/status
 *   GET|POST /api/authority/tasks/:taskId/comments
 *   GET   /api/admin/tasks/assignments
 *   POST  /api/admin/tasks/assign
 *
 * Ownership rules: the authority id always comes from req.user.userId
 * (via authority_applications), the admin id from req.user.userId.
 * Clients never supply user ids, application ids (authority side) or status
 * directly except through the narrow enums below.
 */

export const TASK_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export const taskIdSchema = z.uuid('Task id must be a valid UUID');

export const myTasksQuerySchema = z
  .object({
    status: z
      .preprocess(
        (v) => {
          if (typeof v !== 'string') return v;
          const t = v.trim().toUpperCase();
          return t === '' ? undefined : t;
        },
        z.enum(TASK_STATUSES, { error: `Status must be one of: ${TASK_STATUSES.join(', ')}` }),
      )
      .optional(),
    priority: z
      .preprocess(
        (v) => {
          if (typeof v !== 'string') return v;
          const t = v.trim().toUpperCase();
          return t === '' ? undefined : t;
        },
        z.enum(TASK_PRIORITIES, { error: `Priority must be one of: ${TASK_PRIORITIES.join(', ')}` }),
      )
      .optional(),
    search: z
      .preprocess(
        (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
        z.string().trim().max(200, 'Search must be at most 200 characters').optional(),
      )
      .optional(),
    page: z
      .preprocess(
        (v) => {
          if (v === undefined || (typeof v === 'string' && v.trim() === '')) return undefined;
          return v;
        },
        z.coerce.number({ error: 'Page must be a number' }).int().min(1).max(1000),
      )
      .optional(),
    limit: z
      .preprocess(
        (v) => {
          if (v === undefined || (typeof v === 'string' && v.trim() === '')) return undefined;
          return v;
        },
        z.coerce.number({ error: 'Limit must be a number' }).int().min(1).max(100),
      )
      .optional(),
  })
  .strict();

/** PATCH /api/authority/tasks/:taskId/status — only forward transitions. */
export const updateTaskStatusSchema = z.preprocess(
  (v) => (v === undefined || v === null ? {} : v),
  z
    .object({
      status: z.enum(['IN_PROGRESS', 'COMPLETED', 'CANCELLED'], {
        error: 'Status must be one of: IN_PROGRESS, COMPLETED, CANCELLED',
      }),
      note: z
        .string({ error: 'Note must be a string' })
        .trim()
        .max(2000, 'Note must be at most 2000 characters')
        .optional(),
      reason: z
        .string({ error: 'Reason must be a string' })
        .trim()
        .min(1, 'Reason cannot be blank')
        .max(500, 'Reason must be at most 500 characters')
        .optional(),
    })
    .strict()
    .superRefine((val, ctx) => {
      if (val.status === 'CANCELLED' && !val.reason) {
        ctx.addIssue({ code: 'custom', message: 'A reason is required to reject a task', path: ['reason'] });
      }
    }),
);

export const taskCommentSchema = z.preprocess(
  (v) => (v === undefined || v === null ? {} : v),
  z
    .object({
      body: z
        .string({ error: 'Comment must be a string' })
        .trim()
        .min(1, 'Comment cannot be blank')
        .max(2000, 'Comment must be at most 2000 characters'),
    })
    .strict(),
);

/** POST /api/admin/tasks/assign — manual assignment of a VERIFIED issue. */
export const adminAssignTaskSchema = z
  .object({
    issueId: z.uuid('Issue id must be a valid UUID'),
    /** Authority application id (preferred) or the authority user's id. */
    authorityApplicationId: z.uuid('Authority application id must be a valid UUID').optional(),
    authorityUserId: z.uuid('Authority user id must be a valid UUID').optional(),
    title: z.string().trim().min(1).max(300).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    dueDate: z.string().trim().min(1).max(64).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (!val.authorityApplicationId && !val.authorityUserId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Either authorityApplicationId or authorityUserId is required',
        path: ['authorityApplicationId'],
      });
    }
    if (val.dueDate && Number.isNaN(Date.parse(val.dueDate))) {
      ctx.addIssue({ code: 'custom', message: 'dueDate must be a valid date', path: ['dueDate'] });
    }
  });

export type MyTasksQuery = z.infer<typeof myTasksQuerySchema>;
export type UpdateTaskStatusRequest = z.infer<typeof updateTaskStatusSchema>;
export type TaskCommentRequest = z.infer<typeof taskCommentSchema>;
export type AdminAssignTaskRequest = z.infer<typeof adminAssignTaskSchema>;
