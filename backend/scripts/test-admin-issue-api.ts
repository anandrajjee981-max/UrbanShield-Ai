/**
 * End-to-end smoke test for the ADMIN issue review endpoints.
 *
 *   Terminal 1:  npm run dev
 *   Terminal 2:  npm run test:admin
 *
 * Like the other scripts it plays the browser: one cookie jar per account, the
 * `access_token` value replayed in a `Cookie` header and never exposed to
 * JavaScript or sent as a bearer token.
 *
 * Covers:
 *   - authorisation: no cookie -> 401, CITIZEN / AUTHORITY -> 403, ADMIN allowed
 *   - listing, the `?status=` filter and its rejection of unknown values
 *   - reading one issue, 404 for an unknown id
 *   - REPORTED -> VERIFIED with the reviewer id and timestamp recorded
 *   - REPORTED -> REJECTED with the reviewer id, timestamp and stored reason
 *   - the one-way nature of both transitions (409 on a second attempt)
 *   - that the reviewer always comes from the cookie and never from the body
 *
 * ADMIN accounts are not publicly registerable, so the test provisions one
 * directly in the database, then obtains an admin cookie through the API.
 *
 * Every request uses a unique email, so the script can be run repeatedly.
 */

import { closeDatabasePool, query } from '../src/config/db.js';
import { AUTH_COOKIE_NAME } from '../src/config/auth-cookie.js';

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000';

const PASSWORD = 'password123';

/** A uuid that exists in no table, used for 404 and forged-identity checks. */
const UNKNOWN_UUID = '00000000-0000-0000-0000-00000000dead';

interface TestResult {
  name: string;
  passed: boolean;
  status: number;
  detail: string;
}

interface TestResponse {
  status: number;
  json: unknown;
  raw: string;
}

const results: TestResult[] = [];

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const dataOf = (json: unknown): Record<string, unknown> => asRecord(asRecord(json).data);

const uniqueEmail = (prefix: string): string =>
  `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;

/**
 * One signed-in account, with its own cookie jar - the script needs a citizen,
 * an authority and an admin session at the same time.
 */
interface Session {
  label: string;
  /** Issues a request as this session, storing any `Set-Cookie` it receives. */
  request: (method: string, path: string, body?: unknown) => Promise<TestResponse>;
  /** Same as `request`, but with the cookie jar temporarily emptied. */
  requestAnonymous: (method: string, path: string, body?: unknown) => Promise<TestResponse>;
  signOut: () => void;
  jar: () => string;
}

const storeCookie = (jar: string, setCookieHeader: string): string => {
  const [pair] = setCookieHeader.split(';');
  const [name = '', ...valueParts] = (pair ?? '').split('=');
  const value = valueParts.join('=').trim();

  if (!name) return jar;

  const expiresAt = /;\s*expires=([^;]+)/i.exec(setCookieHeader)?.[1];
  const isExpired =
    expiresAt !== undefined && Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) <= Date.now();

  // `Max-Age=0` / a past `Expires` means the browser drops the cookie.
  if (/;\s*max-age=0(\D|$)/i.test(setCookieHeader) || isExpired) {
    return jar
      .split('; ')
      .filter((entry) => entry.split('=')[0] !== name)
      .join('; ');
  }

  const kept = jar.split('; ').filter((item) => item && item.split('=')[0] !== name);

  return [...kept, `${name}=${value}`].join('; ');
};

const createSession = (label: string): Session => {
  let jar = '';

  const send = async (method: string, path: string, body?: unknown, cookie = jar): Promise<TestResponse> => {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    const raw = await response.text();
    const setCookie = response.headers.getSetCookie().find((header) => header.startsWith(`${AUTH_COOKIE_NAME}=`));

    if (setCookie) {
      jar = storeCookie(jar, setCookie);
    }

    let json: unknown = raw;

    try {
      json = JSON.parse(raw);
    } catch {
      /* keep the raw text */
    }

    return { status: response.status, json, raw };
  };

  return {
    label,
    request: (method, path, body) => send(method, path, body),
    requestAnonymous: (method, path, body) => send(method, path, body, ''),
    signOut: () => {
      jar = '';
    },
    jar: () => jar,
  };
};

const check = (name: string, passed: boolean, status: number, detail: string): void => {
  results.push({ name, passed, status, detail });
  process.stdout.write(`[${passed ? 'PASS' : 'FAIL'}] ${name} (${status}) - ${detail}\n`);
};

interface AdminIssuePayload {
  id: string;
  issueType: string;
  description: string;
  imageUrl: string | null;
  locationType: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  status: string;
  citizen: { name: string; email: string };
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

const readIssue = (json: unknown): AdminIssuePayload | null => {
  const issue = asRecord(dataOf(json).issue);

  return typeof issue.id === 'string' ? (issue as unknown as AdminIssuePayload) : null;
};

const readIssues = (json: unknown): AdminIssuePayload[] => {
  const issues = dataOf(json).issues;

  return Array.isArray(issues) ? (issues as AdminIssuePayload[]) : [];
};

const isTimestamp = (value: unknown): boolean =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));

/** Registers an account and returns its id (the register response logs it in). */
const register = async (
  session: Session,
  name: string,
  role: 'CITIZEN' | 'AUTHORITY',
): Promise<{ userId: string; email: string }> => {
  const email = uniqueEmail(role.toLowerCase());
  const res = await session.request('POST', '/api/auth/register', { name, email, password: PASSWORD, role });
  const user = asRecord(dataOf(res.json).user);
  const userId = typeof user.id === 'string' ? user.id : '';

  if (res.status !== 201 || userId === '') {
    throw new Error(`Could not register ${role}: ${res.status} ${res.raw}`);
  }

  return { userId, email };
};

const createIssue = async (session: Session, description: string): Promise<string> => {
  const res = await session.request('POST', '/api/issues', {
    issueType: 'DRAINAGE',
    description,
    locationType: 'MANUAL',
    address: 'Drainage Area, Ranchi, Jharkhand',
  });

  const issue = readIssue(res.json);

  if (res.status !== 201 || !issue) {
    throw new Error(`Could not create issue: ${res.status} ${res.raw}`);
  }

  return issue.id;
};

const main = async (): Promise<void> => {
  process.stdout.write(`Testing ${BASE_URL} (admin issue verification)\n\n`);

  // ---------------------------------------------------------------- accounts
  const citizen = createSession('citizen');
  const authority = createSession('authority');
  const admin = createSession('admin');

  const citizenAccount = await register(citizen, 'Review Citizen', 'CITIZEN');
  await register(authority, 'Review Authority', 'AUTHORITY');

  const adminEmail = uniqueEmail('admin');
  let adminId = '';

  {
    const res = await admin.request('POST', '/api/auth/register', {
      name: 'Review Admin',
      email: adminEmail,
      password: PASSWORD,
      role: 'CITIZEN',
    });
    const user = asRecord(dataOf(res.json).user);
    adminId = typeof user.id === 'string' ? user.id : '';

    check('POST /api/auth/register (setup admin account)', res.status === 201 && adminId !== '', res.status, `userId=${adminId || 'none'}`);
  }

  {
    await query('UPDATE users SET role = $1 WHERE id = $2', ['ADMIN', adminId]);
    const res = await admin.request('POST', '/api/auth/login', { email: adminEmail, password: PASSWORD });
    const user = asRecord(dataOf(res.json).user);

    check(
      'admin session established after trusted promotion (200)',
      res.status === 200 && user.role === 'ADMIN',
      res.status,
      `role=${String(user.role)}`,
    );
  }

  // ------------------------------------------------------------- fixtures
  const verifyTargetId = await createIssue(citizen, 'The storm drain is blocked and the street floods.');
  const rejectTargetId = await createIssue(citizen, 'Water is leaking from the pipeline near the market.');
  const noReasonTargetId = await createIssue(citizen, 'Waterlogging after every rainfall in this lane.');
  const forgeriesTargetId = await createIssue(citizen, 'Heat is unbearable in the queue outside the ration shop.');

  process.stdout.write('\n');

  // ------------------------------------------------------------ authorisation
  {
    const res = await citizen.requestAnonymous('GET', '/api/admin/issues');

    check(
      'GET /api/admin/issues without cookie (401)',
      res.status === 401 && asRecord(res.json).code === 'MISSING_TOKEN',
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await citizen.requestAnonymous('GET', `/api/admin/issues/${verifyTargetId}`);

    check('GET /api/admin/issues/:id without cookie (401)', res.status === 401, res.status, `code=${String(asRecord(res.json).code)}`);
  }

  {
    const res = await citizen.requestAnonymous('PATCH', `/api/admin/issues/${verifyTargetId}/verify`, {});

    check('PATCH /api/admin/issues/:id/verify without cookie (401)', res.status === 401, res.status, `code=${String(asRecord(res.json).code)}`);
  }

  {
    const res = await authority.requestAnonymous('PATCH', `/api/admin/issues/${verifyTargetId}/reject`, {});

    check('PATCH .../reject without cookie (401)', res.status === 401, res.status, `code=${String(asRecord(res.json).code)}`);
  }

  {
    const res = await citizen.request('GET', '/api/admin/issues');

    check(
      'GET /api/admin/issues as CITIZEN (403)',
      res.status === 403 && asRecord(res.json).code === 'FORBIDDEN',
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await authority.request('GET', '/api/admin/issues');

    check(
      'GET /api/admin/issues as AUTHORITY (403)',
      res.status === 403 && asRecord(res.json).code === 'FORBIDDEN',
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await citizen.request('PATCH', `/api/admin/issues/${verifyTargetId}/verify`, {});

    check('CITIZEN cannot verify an issue (403)', res.status === 403, res.status, `code=${String(asRecord(res.json).code)}`);
  }

  {
    const res = await authority.request('PATCH', `/api/admin/issues/${verifyTargetId}/reject`, { reason: 'nope' });

    check('AUTHORITY cannot reject an issue (403)', res.status === 403, res.status, `code=${String(asRecord(res.json).code)}`);
  }

  {
    const res = await admin.request('GET', '/api/admin/issues');
    const issues = readIssues(res.json);

    check(
      'GET /api/admin/issues as ADMIN (200)',
      res.status === 200 && issues.length > 0,
      res.status,
      `count=${issues.length}`,
    );
  }

  process.stdout.write('\n');

  // ----------------------------------------------------------------- listing
  {
    const res = await admin.request('GET', '/api/admin/issues');
    const issues = readIssues(res.json);
    const ids = issues.map((issue) => issue.id);

    check(
      'admin listing contains the freshly reported issues',
      ids.includes(verifyTargetId) && ids.includes(rejectTargetId) && ids.includes(noReasonTargetId),
      res.status,
      `${issues.length} issues listed`,
    );

    const timestamps = issues.map((issue) => Date.parse(issue.createdAt));
    const newestFirst = timestamps.every((value, index) => index === 0 || (timestamps[index - 1] ?? 0) >= value);
    check('admin listing is ordered newest first', newestFirst, res.status, `order verified over ${timestamps.length} items`);
  }

  {
    const res = await admin.request('GET', '/api/admin/issues?status=REPORTED');
    const issues = readIssues(res.json);

    check(
      'GET /api/admin/issues?status=REPORTED (200) returns only REPORTED issues',
      res.status === 200 && issues.length > 0 && issues.every((issue) => issue.status === 'REPORTED'),
      res.status,
      `count=${issues.length}`,
    );
  }

  {
    const res = await admin.request('GET', '/api/admin/issues?status=VERIFIED');

    check(
      'GET /api/admin/issues?status=VERIFIED (200) is empty before any verification',
      res.status === 200 && readIssues(res.json).length === 0,
      res.status,
      `count=${readIssues(res.json).length}`,
    );
  }

  {
    const invalidStatuses = ['UNKNOWN', 'verified', 'in_progress', 'ASSIGNED', 'IN_PROGRESS'];

    for (const status of invalidStatuses) {
      const res = await admin.request('GET', `/api/admin/issues?status=${status}`);

      check(
        `GET /api/admin/issues rejects status=${status} (400)`,
        res.status === 400 && res.raw.includes('VALIDATION_ERROR'),
        res.status,
        `code=${String(asRecord(res.json).code)}`,
      );
    }
  }

  {
    const res = await admin.request('GET', '/api/admin/issues?states=REPORTED');

    check(
      'GET /api/admin/issues rejects an unknown query parameter (400)',
      res.status === 400 && res.raw.includes('VALIDATION_ERROR'),
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await admin.request('GET', '/api/admin/issues?limit=0');

    check(
      'GET /api/admin/issues rejects limit=0 (400)',
      res.status === 400 && res.raw.includes('VALIDATION_ERROR'),
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  process.stdout.write('\n');

  // ----------------------------------------------------------- single issue
  {
    const res = await admin.request('GET', `/api/admin/issues/${rejectTargetId}`);
    const issue = readIssue(res.json);

    check('GET /api/admin/issues/:issueId as ADMIN (200)', res.status === 200 && issue !== null, res.status, `id=${issue?.id ?? 'none'}`);
    check(
      'single issue carries the report, its location and the citizen',
      issue?.issueType === 'DRAINAGE' &&
        issue?.description === 'Water is leaking from the pipeline near the market.' &&
        issue?.locationType === 'MANUAL' &&
        issue?.address === 'Drainage Area, Ranchi, Jharkhand' &&
        issue?.latitude === null &&
        issue?.longitude === null &&
        issue?.status === 'REPORTED' &&
        issue?.citizen.email === citizenAccount.email,
      res.status,
      `citizen=${issue?.citizen.email ?? 'none'}`,
    );
    check('single issue starts with empty review metadata', issue?.verifiedBy === null && issue?.verifiedAt === null && issue?.rejectedBy === null && issue?.rejectedAt === null && issue?.rejectionReason === null, res.status, 'metadata null');
    check(
      'admin payload hides userId, imageFileId, password_hash and the token',
      !res.raw.includes('userId') && !res.raw.includes('imageFileId') && !res.raw.includes('password_hash') && !/"token"/i.test(res.raw),
      res.status,
      'no internal fields leaked',
    );
  }

  {
    const res = await admin.request('GET', `/api/admin/issues/${UNKNOWN_UUID}`);

    check(
      'GET /api/admin/issues/:issueId unknown id (404)',
      res.status === 404 && asRecord(res.json).code === 'ISSUE_NOT_FOUND',
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await admin.request('GET', '/api/admin/issues/not-a-uuid');

    check(
      'GET /api/admin/issues/:issueId malformed id (400)',
      res.status === 400 && res.raw.includes('VALIDATION_ERROR'),
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  process.stdout.write('\n');

  // ------------------------------------------------------------ verification
  {
    const res = await admin.request('PATCH', `/api/admin/issues/${verifyTargetId}/verify`, {});
    const issue = readIssue(res.json);

    check(
      'PATCH /api/admin/issues/:issueId/verify REPORTED -> VERIFIED (200)',
      res.status === 200 && issue?.status === 'VERIFIED',
      res.status,
      `status=${issue?.status ?? 'none'} message="${String(asRecord(res.json).message)}"`,
    );
    check('verify records the authenticated admin as verifiedBy', issue?.verifiedBy === adminId, res.status, `verifiedBy=${issue?.verifiedBy ?? 'none'} expected=${adminId}`);
    check('verify records verified_at', isTimestamp(issue?.verifiedAt), res.status, `verifiedAt=${String(issue?.verifiedAt)}`);
    check('verify leaves the rejection columns empty', issue?.rejectedBy === null && issue?.rejectedAt === null && issue?.rejectionReason === null, res.status, 'rejection metadata null');
    check('verify updates updatedAt', isTimestamp(issue?.updatedAt), res.status, `updatedAt=${String(issue?.updatedAt)}`);
  }

  {
    const res = await admin.request('PATCH', `/api/admin/issues/${verifyTargetId}/verify`);

    check(
      'verify an already VERIFIED issue (409)',
      res.status === 409 && asRecord(res.json).code === 'ISSUE_ALREADY_PROCESSED',
      res.status,
      `message="${String(asRecord(res.json).message)}"`,
    );
  }

  {
    const res = await admin.request('PATCH', `/api/admin/issues/${verifyTargetId}/reject`, { reason: 'Changed my mind.' });

    check(
      'reject an already VERIFIED issue (409)',
      res.status === 409 && asRecord(res.json).code === 'ISSUE_ALREADY_PROCESSED',
      res.status,
      `message="${String(asRecord(res.json).message)}"`,
    );
  }

  {
    const res = await admin.request('GET', `/api/admin/issues/${verifyTargetId}`);
    const issue = readIssue(res.json);

    check('verified issue reads back as VERIFIED with its reviewer', res.status === 200 && issue?.status === 'VERIFIED' && issue?.verifiedBy === adminId, res.status, `status=${issue?.status}`);
  }

  {
    const res = await admin.request('GET', '/api/admin/issues?status=VERIFIED');
    const issues = readIssues(res.json);

    check(
      'GET /api/admin/issues?status=VERIFIED lists the verified issue',
      res.status === 200 && issues.length === 1 && issues[0]?.id === verifyTargetId,
      res.status,
      `count=${issues.length}`,
    );
  }

  process.stdout.write('\n');

  // -------------------------------------------------------------- rejection
  {
    const reason = '   Insufficient evidence provided.   ';
    const res = await admin.request('PATCH', `/api/admin/issues/${rejectTargetId}/reject`, { reason });
    const issue = readIssue(res.json);

    check(
      'PATCH /api/admin/issues/:issueId/reject REPORTED -> REJECTED (200)',
      res.status === 200 && issue?.status === 'REJECTED',
      res.status,
      `status=${issue?.status ?? 'none'} message="${String(asRecord(res.json).message)}"`,
    );
    check('reject records the authenticated admin as rejectedBy', issue?.rejectedBy === adminId, res.status, `rejectedBy=${issue?.rejectedBy ?? 'none'}`);
    check('reject records rejected_at', isTimestamp(issue?.rejectedAt), res.status, `rejectedAt=${String(issue?.rejectedAt)}`);
    check('reject stores the trimmed reason in its own column', issue?.rejectionReason === reason.trim(), res.status, `reason="${String(issue?.rejectionReason)}"`);
    check('reject leaves the citizen description untouched', issue?.description === 'Water is leaking from the pipeline near the market.', res.status, 'description unchanged');
  }

  {
    const res = await admin.request('PATCH', `/api/admin/issues/${rejectTargetId}/verify`, {});

    check(
      'verify an already REJECTED issue (409)',
      res.status === 409 && asRecord(res.json).code === 'ISSUE_ALREADY_PROCESSED',
      res.status,
      `message="${String(asRecord(res.json).message)}"`,
    );
  }

  {
    const res = await admin.request('PATCH', `/api/admin/issues/${rejectTargetId}/reject`, { reason: 'again' });

    check(
      'reject an already REJECTED issue (409)',
      res.status === 409 && asRecord(res.json).code === 'ISSUE_ALREADY_PROCESSED',
      res.status,
      `message="${String(asRecord(res.json).message)}"`,
    );
  }

  {
    const res = await admin.request('PATCH', `/api/admin/issues/${noReasonTargetId}/reject`);
    const issue = readIssue(res.json);

    check(
      'reject without a body is allowed (200)',
      res.status === 200 && issue?.status === 'REJECTED' && issue?.rejectionReason === null,
      res.status,
      `status=${issue?.status} reason=${String(issue?.rejectionReason)}`,
    );
    check('reject without a reason still records the admin and the timestamp', issue?.rejectedBy === adminId && isTimestamp(issue?.rejectedAt), res.status, `rejectedBy=${String(issue?.rejectedBy)}`);
  }

  {
    const res = await admin.request('PATCH', `/api/admin/issues/${forgeriesTargetId}/reject`, { reason: '    ' });

    check(
      'reject with a whitespace-only reason (400)',
      res.status === 400 && res.raw.includes('VALIDATION_ERROR'),
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await admin.request('PATCH', `/api/admin/issues/${forgeriesTargetId}/reject`, { reason: 'x'.repeat(501) });

    check(
      'reject with an over-long reason (400)',
      res.status === 400 && res.raw.includes('VALIDATION_ERROR'),
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await admin.request('GET', '/api/admin/issues?status=REJECTED');
    const issues = readIssues(res.json);

    check(
      'GET /api/admin/issues?status=REJECTED lists both rejected issues',
      res.status === 200 && issues.length === 2 && issues.every((issue) => issue.status === 'REJECTED'),
      res.status,
      `count=${issues.length}`,
    );
  }

  process.stdout.write('\n');

  // ---------------------------------------------------------------- security
  {
    const forged = [
      { name: 'verifiedBy', body: { verifiedBy: UNKNOWN_UUID } },
      { name: 'rejectedBy', body: { rejectedBy: UNKNOWN_UUID } },
      { name: 'adminId', body: { adminId: UNKNOWN_UUID } },
      { name: 'status', body: { status: 'VERIFIED' } },
      { name: 'verifiedAt', body: { verifiedAt: new Date().toISOString() } },
    ];

    for (const payload of forged) {
      const res = await admin.request('PATCH', `/api/admin/issues/${forgeriesTargetId}/verify`, payload.body);

      check(
        `verify rejects a body containing ${payload.name} (400)`,
        res.status === 400 && res.raw.includes('VALIDATION_ERROR'),
        res.status,
        `code=${String(asRecord(res.json).code)}`,
      );
    }
  }

  {
    for (const payload of [{ status: 'VERIFIED' }, { adminId: UNKNOWN_UUID }, { reason: 'ok', verifiedBy: UNKNOWN_UUID }]) {
      const res = await admin.request('PATCH', `/api/admin/issues/${forgeriesTargetId}/reject`, payload);

      check(
        `reject rejects a body containing ${Object.keys(payload)[0]} (400)`,
        res.status === 400 && res.raw.includes('VALIDATION_ERROR'),
        res.status,
        `code=${String(asRecord(res.json).code)}`,
      );
    }
  }

  {
    // The forged identities above must not have changed anything, and the real
    // admin must be the one recorded.
    const res = await admin.request('PATCH', `/api/admin/issues/${forgeriesTargetId}/verify`, {});
    const issue = readIssue(res.json);

    check(
      'the recorded reviewer is the cookie admin, never a client supplied id',
      res.status === 200 && issue?.verifiedBy === adminId && issue?.verifiedBy !== UNKNOWN_UUID,
      res.status,
      `verifiedBy=${String(issue?.verifiedBy)}`,
    );
  }

  {
    const res = await admin.request('PATCH', `/api/admin/issues/${forgeriesTargetId}`);

    check(
      'there is no free-form PATCH /api/admin/issues/:issueId (404)',
      res.status === 404 && asRecord(res.json).code === 'ROUTE_NOT_FOUND',
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await admin.request('POST', `/api/admin/issues/${forgeriesTargetId}/verify`, {});

    check(
      'the verify action is PATCH only (404 for POST)',
      res.status === 404 && asRecord(res.json).code === 'ROUTE_NOT_FOUND',
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await citizen.request('POST', '/api/issues', {
      issueType: 'OTHER',
      description: 'Trying to self-verify through the citizen endpoint.',
      locationType: 'MANUAL',
      address: 'Ranchi',
      status: 'VERIFIED',
    });

    check(
      'a citizen still cannot create an issue with a status (400)',
      res.status === 400 && res.raw.includes('VALIDATION_ERROR'),
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await citizen.request('GET', '/api/issues/my');
    const issues = Array.isArray(dataOf(res.json).issues) ? (dataOf(res.json).issues as Array<Record<string, unknown>>) : [];
    const verified = issues.find((issue) => issue.id === verifyTargetId);

    check(
      'the citizen sees their verified report as VERIFIED in "My Reports"',
      res.status === 200 && verified?.status === 'VERIFIED',
      res.status,
      `status=${String(verified?.status)}`,
    );
    check(
      '"My Reports" still hides internal columns',
      !res.raw.includes('userId') && !res.raw.includes('imageFileId') && !res.raw.includes('password_hash'),
      res.status,
      'no internal fields leaked',
    );
  }

  {
    const res = await admin.request('GET', '/api/admin/issues');
    const issues = readIssues(res.json);
    const allReviewed = issues.filter((issue) => issue.status !== 'REPORTED');

    check(
      'reviewed issues report their outcome and reviewer on the dashboard',
      allReviewed.length >= 4 &&
        allReviewed.every(
          (issue) =>
            (issue.status === 'VERIFIED' && issue.verifiedBy === adminId && isTimestamp(issue.verifiedAt)) ||
            (issue.status === 'REJECTED' && issue.rejectedBy === adminId && isTimestamp(issue.rejectedAt)),
        ),
      res.status,
      `${allReviewed.length} reviewed issues`,
    );
    check(
      'the admin listing never exposes credentials',
      !res.raw.includes('password_hash') && !res.raw.includes(PASSWORD) && !res.raw.includes('private_'),
      res.status,
      'no credentials in payload',
    );
  }

  {
    const res = await admin.request('POST', '/api/auth/logout');
    const after = await admin.request('GET', '/api/admin/issues');

    check(
      'after logout the admin endpoints are protected again (401)',
      res.status === 200 && after.status === 401,
      after.status,
      `code=${String(asRecord(after.json).code)}`,
    );
  }

  {
    const res = await citizen.request('POST', '/api/auth/logout');
    check('citizen logout (200)', res.status === 200, res.status, `session cleared`);
  }

  const failed = results.filter((result) => !result.passed);
  process.stdout.write(`\n${results.length - failed.length}/${results.length} checks passed\n`);

  if (failed.length > 0) {
    process.stdout.write(`Failed: ${failed.map((result) => result.name).join(', ')}\n`);
    process.exitCode = 1;
  }
};

try {
  await main();
} catch (error: unknown) {
  process.stderr.write(`Test run failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  await closeDatabasePool();
}
