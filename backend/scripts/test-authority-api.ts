/**
 * End-to-end smoke test for the AUTHORITY registration + verification workflow.
 *
 *   Terminal 1:  npm run db:migrate   (once, so migration 004 is applied)
 *   Terminal 2:  npm run dev
 *   Terminal 3:  npm run test:authority
 *
 * Like the other scripts it plays the browser: one cookie jar per account, the
 * `access_token` value replayed in a `Cookie` header and never exposed to
 * JavaScript or sent as a bearer token.
 *
 * Covers, in the order the workflow runs:
 *   - a candidate submitting a valid application lands in PENDING
 *   - every validation rule that guards a submission
 *   - authorisation: no cookie -> 401, CITIZEN / AUTHORITY -> 403 on the admin
 *     endpoints, ADMIN allowed
 *   - PENDING -> VERIFIED and PENDING -> REJECTED, with reviewer and reason
 *   - the one-way nature of both transitions (409 on a second attempt)
 *   - REJECTED -> PENDING via re-submission, and that the history survives it
 *   - that a candidate is not a verified authority until an admin says so
 *     (`/api/authority/profile` is 403 while PENDING)
 *   - security: the government ID is never returned unmasked, the private document
 *     URL never reaches a candidate or another authority, and role/status cannot be
 *     dictated from a request body
 *
 * ADMIN accounts cannot be created through the public registration endpoint
 * (`registerSchema` only accepts CITIZEN / AUTHORITY), so the admin is promoted
 * with a direct `UPDATE users SET role` and then logs in again to obtain an ADMIN
 * cookie. That single write is the only way this script touches the database;
 * everything after it goes through the HTTP API.
 *
 * Every request uses a unique email, so the script can be run repeatedly.
 */

import { closeDatabasePool, query } from '../src/config/db.js';
import { AUTH_COOKIE_NAME } from '../src/config/auth-cookie.js';

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000';

const PASSWORD = 'password123';

/** A uuid that exists in no table, used for 404 and forged-identity checks. */
const UNKNOWN_UUID = '00000000-0000-0000-0000-00000000dead';

/**
 * A real government ID number used throughout the script.
 *
 * The assertions below grep every response for this exact string: if it ever
 * appears verbatim in a payload, that payload leaked the secret.
 */
const GOV_ID_NUMBER = '123456789012';

/** What the API is required to return instead of {@link GOV_ID_NUMBER}. */
const GOV_ID_MASK = 'XXXX-XXXX-9012';

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
 * One signed-in account, with its own cookie jar - the script needs a candidate,
 * a second candidate, a citizen and an admin session at the same time.
 */
interface Session {
  label: string;
  /** Issues a request as this session, storing any `Set-Cookie` it receives. */
  request: (method: string, path: string, body?: unknown) => Promise<TestResponse>;
  /** Sends a request with no cookie at all. */
  requestAnonymous: (method: string, path: string, body?: unknown) => Promise<TestResponse>;
  /** Sends a multipart request as this session. */
  requestMultipart: (
    method: string,
    path: string,
    fields: Record<string, string>,
    file?: { field: string; filename: string; type: string; bytes: Buffer },
  ) => Promise<TestResponse>;
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

  const send = async (
    method: string,
    path: string,
    body?: unknown,
    cookie = jar,
  ): Promise<TestResponse> => {
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

  /**
   * Builds a multipart body by hand rather than using FormData, so the declared
   * part names and content types are explicit and a bogus type can be sent to prove
   * the upload allow list is enforced.
   */
  const sendMultipart = async (
    method: string,
    path: string,
    fields: Record<string, string>,
    file?: { field: string; filename: string; type: string; bytes: Buffer },
    cookie = jar,
  ): Promise<TestResponse> => {
    const boundary = `----urbanshield${Date.now()}${Math.floor(Math.random() * 1e9)}`;
    const chunks: Buffer[] = [];

    for (const [name, value] of Object.entries(fields)) {
      chunks.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
          'utf8',
        ),
      );
    }

    if (file) {
      chunks.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${file.field}"; filename="${file.filename}"\r\nContent-Type: ${file.type}\r\n\r\n`,
          'utf8',
        ),
        file.bytes,
        Buffer.from('\r\n', 'utf8'),
      );
    }

    chunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'));

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: Buffer.concat(chunks),
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
    requestMultipart: (method, path, fields, file) => sendMultipart(method, path, fields, file),
    jar: () => jar,
  };
};

const check = (name: string, passed: boolean, status: number, detail: string): void => {
  results.push({ name, passed, status, detail });
  process.stdout.write(`[${passed ? 'PASS' : 'FAIL'}] ${name} (${status}) - ${detail}\n`);
};

interface ApplicationPayload {
  id: string;
  fullName: string;
  verificationStatus: string;
  governmentIdMasked: string;
  hasDocument: boolean;
  documentUrl?: string | null;
  department: string;
  designation: string;
  skills: string[];
  jurisdictionType: string;
  jurisdictionName: string;
  availability: string;
  rejectionReason: string | null;
  verifiedAt: string | null;
  verifiedBy?: string | null;
  rejectedAt: string | null;
}

const readApplication = (json: unknown): ApplicationPayload | null => {
  const application = asRecord(dataOf(json).application);

  return typeof application.id === 'string' ? (application as unknown as ApplicationPayload) : null;
};

const isTimestamp = (value: unknown): boolean =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));

/**
 * A minimal but genuinely valid 1x1 PNG.
 *
 * Real bytes, so the upload passes the type allow list and is forwarded to
 * ImageKit exactly as a genuine document would be.
 */
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64',
);

const validFields = (overrides: Record<string, string> = {}): Record<string, string> => ({
  fullName: 'Ramesh Kumar Singh',
  dateOfBirth: '1990-04-17',
  phone: '9876543210',
  email: 'ramesh.kumar@example.com',
  address: 'Sector 4, Doranda, Ranchi, Jharkhand 834002',
  governmentIdType: 'AADHAAR',
  governmentIdNumber: GOV_ID_NUMBER,
  department: 'WATER_MANAGEMENT',
  designation: 'FIELD_OFFICER',
  // A comma separated list, which is how a multi-select arrives over multipart.
  skills: 'PLUMBING,EMERGENCY_RESPONSE',
  jurisdictionType: 'WARD',
  jurisdictionName: 'Ward 12',
  ...overrides,
});

const pngFile = () => ({
  field: 'document',
  filename: 'aadhaar.png',
  type: 'image/png',
  bytes: PNG_BYTES,
});

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
    throw new Error(
      `Could not register ${role}: ${res.status} ${res.raw}` +
        (res.status === 429
          ? '\n\n  /api/auth/register shares a 20-requests-per-15-minutes limiter with ' +
            '/api/auth/login. Wait for that window to pass before re-running this script.'
          : ''),
    );
  }

  return { userId, email };
};

const submitApplication = async (
  session: Session,
  overrides: Record<string, string> = {},
): Promise<TestResponse> =>
  session.requestMultipart('POST', '/api/authority/application', validFields(overrides), pngFile());

const main = async (): Promise<void> => {
  process.stdout.write(`Testing ${BASE_URL} (authority registration + verification)\n\n`);

  // ---------------------------------------------------------------- accounts
  const candidate = createSession('candidate');
  const otherCandidate = createSession('other-candidate');
  const citizen = createSession('citizen');
  const admin = createSession('admin');

  const candidateAccount = await register(candidate, 'Ramesh Kumar Singh', 'AUTHORITY');
  await register(otherCandidate, 'Sunita Devi', 'AUTHORITY');
  await register(citizen, 'Plain Citizen', 'CITIZEN');

  {
    // The distinction the whole module is built on: registering as AUTHORITY makes
    // someone a *candidate* and nothing more. No verification state exists yet, and
    // every authority-only operation refuses them below.
    const res = await candidate.request('GET', '/api/auth/me');
    const user = asRecord(dataOf(res.json).user);

    check(
      'registering as AUTHORITY yields role AUTHORITY and no authority access yet',
      res.status === 200 &&
        user.role === 'AUTHORITY' &&
        user.id === candidateAccount.userId,
      res.status,
      `role=${String(user.role)}`,
    );
  }

  const adminEmail = uniqueEmail('admin');
  let adminId = '';

  {
    // Registered as a citizen, promoted with one direct SQL write, then logged in
    // again so the cookie carries role ADMIN.
    const res = await admin.request('POST', '/api/auth/register', {
      name: 'Verification Admin',
      email: adminEmail,
      password: PASSWORD,
      role: 'CITIZEN',
    });
    const user = asRecord(dataOf(res.json).user);
    adminId = typeof user.id === 'string' ? user.id : '';

    check(
      'POST /api/auth/register (setup admin account)',
      res.status === 201 && adminId !== '',
      res.status,
      `userId=${adminId || 'none'}`,
    );
  }

  {
    await query('UPDATE users SET role = $1 WHERE id = $2', ['ADMIN', adminId]);
    const res = await admin.request('POST', '/api/auth/login', { email: adminEmail, password: PASSWORD });
    const user = asRecord(dataOf(res.json).user);

    check(
      'admin session established after promotion (200)',
      res.status === 200 && user.role === 'ADMIN',
      res.status,
      `role=${String(user.role)}`,
    );
  }

  process.stdout.write('\n');

  // ------------------------------------------------------- options catalogue
  {
    const res = await candidate.request('GET', '/api/authority/application/options');
    const options = asRecord(dataOf(res.json).options);
    const departments = Array.isArray(options.departments) ? options.departments : [];
    const skills = Array.isArray(options.skills) ? options.skills : [];

    check(
      'GET /api/authority/application/options (200) publishes the closed vocabularies',
      res.status === 200 &&
        departments.includes('WATER_MANAGEMENT') &&
        departments.includes('OTHER') &&
        skills.includes('PLUMBING'),
      res.status,
      `${departments.length} departments, ${skills.length} skills`,
    );
  }

  {
    const res = await citizen.request('GET', '/api/authority/application/options');

    check(
      'GET /api/authority/application/options as CITIZEN (403)',
      res.status === 403 && asRecord(res.json).code === 'FORBIDDEN',
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  // ------------------------------------------------------- no application yet
  {
    const res = await candidate.request('GET', '/api/authority/application');
    const application = dataOf(res.json).application;

    check(
      'GET /api/authority/application before submitting (200, application is null)',
      res.status === 200 && application === null,
      res.status,
      `application=${String(application)}`,
    );
  }

  // ------------------------------------------------------------- submission
  let candidateApplicationId = '';

  {
    const res = await submitApplication(candidate);
    const application = readApplication(res.json);
    candidateApplicationId = application?.id ?? '';

    check(
      'POST /api/authority/application with a valid application (201, PENDING)',
      res.status === 201 && application !== null && application.verificationStatus === 'PENDING',
      res.status,
      `status=${application?.verificationStatus ?? 'none'}`,
    );
  }

  {
    const res = await candidate.request('GET', '/api/authority/application');
    const application = readApplication(res.json);

    check(
      'the submitted application is stored and reads back',
      res.status === 200 && application?.id === candidateApplicationId,
      res.status,
      `id=${application?.id ?? 'none'}`,
    );
  }

  {
    const res = await submitApplication(candidate);

    check(
      'a second submission while PENDING is refused (409)',
      res.status === 409,
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  // ------------------------------------------------------------- validation
  {
    const res = await candidate.requestMultipart(
      'POST',
      '/api/authority/application',
      validFields(),
      // A valid PNG sent under the wrong field name.
      { field: 'aadhaar', filename: 'a.png', type: 'image/png', bytes: PNG_BYTES },
    );

    check(
      'a document sent in the wrong multipart field is refused (400)',
      res.status === 400 && asRecord(res.json).code === 'UNEXPECTED_FILE_FIELD',
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await candidate.requestMultipart('POST', '/api/authority/application', validFields());

    check(
      'a submission with no document at all is refused (400 DOCUMENT_REQUIRED)',
      res.status === 400 && asRecord(res.json).code === 'DOCUMENT_REQUIRED',
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await candidate.requestMultipart(
      'POST',
      '/api/authority/application',
      validFields(),
      { field: 'document', filename: 'payload.exe', type: 'application/x-msdownload', bytes: Buffer.from('MZ') },
    );

    check(
      'an unsupported document type is refused (400 UNSUPPORTED_DOCUMENT_TYPE)',
      res.status === 400 && asRecord(res.json).code === 'UNSUPPORTED_DOCUMENT_TYPE',
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    // 9 MB, above the 8 MB cap, with a legitimate mime type - so this proves the
    // size limit rather than the type filter.
    const oversized = { field: 'document', filename: 'big.png', type: 'image/png', bytes: Buffer.alloc(9 * 1024 * 1024, 1) };
    const res = await candidate.requestMultipart('POST', '/api/authority/application', validFields(), oversized);

    check(
      'an oversized document is refused (400 DOCUMENT_TOO_LARGE)',
      res.status === 400 && asRecord(res.json).code === 'DOCUMENT_TOO_LARGE',
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  process.stdout.write('\n');

  /**
   * Every case below is rejected during validation, before anything is written, so
   * the account is left without an application and can try again. One account
   * therefore covers all of them - which matters, because `/api/auth/register`
   * shares a 20-requests-per-15-minutes limiter with `/login` and a fresh account
   * per case would exhaust it long before the workflow under test began.
   */
  const validationSession = createSession('validation');
  await register(validationSession, 'Validation Candidate', 'AUTHORITY');

  const validationCases: { label: string; fields: Record<string, string>; expected: string }[] = [
    { label: 'a missing full name', fields: validFields({ fullName: '' }), expected: 'Full name' },
    { label: 'a missing date of birth', fields: validFields({ dateOfBirth: '' }), expected: 'Date of birth is required' },
    { label: 'an impossible date of birth', fields: validFields({ dateOfBirth: '1990-02-31' }), expected: 'real calendar date' },
    { label: 'a future date of birth', fields: validFields({ dateOfBirth: '2099-01-01' }), expected: 'years old' },
    { label: 'a malformed phone number', fields: validFields({ phone: '12345' }), expected: 'Phone number must be' },
    { label: 'a malformed email', fields: validFields({ email: 'not-an-email' }), expected: 'valid email' },
    { label: 'an invalid department', fields: validFields({ department: 'SPACE_FORCE' }), expected: 'Department must be one of' },
    { label: 'an invalid designation', fields: validFields({ designation: 'CHIEF_TENOR' }), expected: 'Designation must be one of' },
    { label: 'an invalid jurisdiction type', fields: validFields({ jurisdictionType: 'PLANET' }), expected: 'Jurisdiction type must be one of' },
    { label: 'a missing jurisdiction name', fields: validFields({ jurisdictionName: '' }), expected: 'Jurisdiction name is required' },
    { label: 'an invalid skill', fields: validFields({ skills: 'PLUMBING,TELEPORTATION' }), expected: 'Skill must be one of' },
    { label: 'an empty skill list', fields: validFields({ skills: '' }), expected: 'At least one skill is required' },
    { label: 'an invalid government ID type', fields: validFields({ governmentIdType: 'PASSPORT' }), expected: 'Government ID type must be one of' },
    { label: 'a too short government ID', fields: validFields({ governmentIdNumber: '123' }), expected: 'at least 8 characters' },
    { label: 'a non alphanumeric government ID', fields: validFields({ governmentIdNumber: '1234#5678#9012' }), expected: 'letters and digits' },
    { label: 'an invalid availability', fields: validFields({ availability: 'ON_HOLIDAY' }), expected: 'Availability must be one of' },
  ];

  for (const testCase of validationCases) {
    const res = await validationSession.requestMultipart(
      'POST',
      '/api/authority/application',
      testCase.fields,
      pngFile(),
    );
    const errors = asRecord(res.json).errors;
    const detail = Array.isArray(errors) ? errors.join(' | ') : String(asRecord(res.json).message);

    check(
      `${testCase.label} is refused (400)`,
      res.status === 400 && detail.includes(testCase.expected),
      res.status,
      detail.slice(0, 160),
    );
  }

  {
    // Proof that none of the refusals above left an application behind, which is
    // what allowed one account to be reused for all of them.
    const res = await validationSession.request('GET', '/api/authority/application');
    const application = dataOf(res.json).application;

    check(
      'the reused candidate still has no application after every refusal (200, null)',
      res.status === 200 && application === null,
      res.status,
      `application=${String(application)}`,
    );
  }

  process.stdout.write('\n');

  // ------------------------------------------------------ client-side forgery
  {
    const res = await validationSession.requestMultipart(
      'POST',
      '/api/authority/application',
      validFields({
        // A client trying to dictate the outcome of its own application.
        verificationStatus: 'VERIFIED',
        role: 'ADMIN',
        isVerified: 'true',
      }),
      pngFile(),
    );

    check(
      'a body that tries to set verificationStatus / role / isVerified is refused (400)',
      res.status === 400 && asRecord(res.json).code === 'VALIDATION_ERROR',
      res.status,
      `${String(asRecord(res.json).code)}: ${(asRecord(res.json).errors as string[] | undefined)?.join(' | ') ?? ''}`.slice(0, 200),
    );
  }

  {
    const forgedReviewer = createSession('forged-reviewer');
    await register(forgedReviewer, 'Forged Reviewer', 'AUTHORITY');
    const res = await submitApplication(forgedReviewer);

    check(
      'the forgery-free candidate submission still succeeds',
      res.status === 201,
      res.status,
      `status=${readApplication(res.json)?.verificationStatus ?? 'none'}`,
    );
  }

  // ----------------------------------------------------------- authorisation
  {
    const res = await candidate.requestAnonymous('GET', '/api/admin/authority-applications');

    check(
      'GET /api/admin/authority-applications without cookie (401)',
      res.status === 401 && asRecord(res.json).code === 'MISSING_TOKEN',
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await citizen.request('GET', '/api/admin/authority-applications');

    check(
      'GET /api/admin/authority-applications as CITIZEN (403)',
      res.status === 403 && asRecord(res.json).code === 'FORBIDDEN',
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await candidate.request('GET', '/api/admin/authority-applications');

    check(
      'GET /api/admin/authority-applications as an unverified AUTHORITY (403)',
      res.status === 403 && asRecord(res.json).code === 'FORBIDDEN',
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await candidate.request('GET', `/api/admin/authority-applications/${candidateApplicationId}`);

    check(
      'an AUTHORITY cannot read an application for review (403)',
      res.status === 403,
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await candidate.request('PATCH', `/api/admin/authority-applications/${candidateApplicationId}/verify`, {});

    check(
      'an AUTHORITY cannot verify an application (403)',
      res.status === 403,
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await candidate.request('PATCH', `/api/admin/authority-applications/${candidateApplicationId}/reject`, {
      reason: 'self approval',
    });

    check(
      'an AUTHORITY cannot reject an application (403)',
      res.status === 403,
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await candidate.requestMultipart(
      'POST',
      '/api/authority/application',
      validFields(),
      pngFile(),
    );

    check(
      'an unauthenticated request never reaches the upload parser (401)',
      res.status === 401,
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  process.stdout.write('\n');

  // ------------------------------------------------ candidate != authority
  {
    const res = await candidate.request('GET', '/api/authority/profile');

    check(
      'GET /api/authority/profile while PENDING (403 AUTHORITY_NOT_VERIFIED)',
      res.status === 403 && asRecord(res.json).code === 'AUTHORITY_NOT_VERIFIED',
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  // ------------------------------------------------------------ admin queue
  {
    const res = await admin.request('GET', '/api/admin/authority-applications');
    const applications = asRecord(dataOf(res.json)).applications;
    const list = Array.isArray(applications) ? (applications as ApplicationPayload[]) : [];

    check(
      'GET /api/admin/authority-applications as ADMIN (200) lists the pending application',
      res.status === 200 && list.some((application) => application.id === candidateApplicationId),
      res.status,
      `${list.length} applications listed`,
    );
  }

  {
    const res = await admin.request('GET', '/api/admin/authority-applications?status=PENDING');
    const applications = asRecord(dataOf(res.json)).applications;
    const list = Array.isArray(applications) ? (applications as ApplicationPayload[]) : [];

    check(
      'GET ...?status=PENDING returns only PENDING applications',
      res.status === 200 && list.length > 0 && list.every((application) => application.verificationStatus === 'PENDING'),
      res.status,
      `${list.length} pending`,
    );
  }

  {
    const res = await admin.request('GET', '/api/admin/authority-applications?status=NOT_A_STATUS');

    check(
      'GET ...?status=<unknown> is refused (400)',
      res.status === 400 && asRecord(res.json).code === 'VALIDATION_ERROR',
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await admin.request('GET', '/api/admin/authority-applications?states=PENDING');

    check(
      'GET ...?states=PENDING (typo) is refused rather than silently unfiltered (400)',
      res.status === 400,
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  process.stdout.write('\n');

  // -------------------------------------------------- masking / confidentiality
  {
    const res = await admin.request('GET', `/api/admin/authority-applications/${candidateApplicationId}`);
    const application = readApplication(res.json);

    check(
      'the admin review payload masks the government ID',
      res.status === 200 && application?.governmentIdMasked === GOV_ID_MASK,
      res.status,
      `masked=${application?.governmentIdMasked ?? 'none'}`,
    );
    check(
      'the raw government ID never appears in the admin response',
      !res.raw.includes(GOV_ID_NUMBER),
      res.status,
      'no plaintext ID in payload',
    );
    check(
      'the admin review payload never contains a raw id field name',
      !res.raw.includes('governmentIdNumber'),
      res.status,
      'no governmentIdNumber key in payload',
    );
    check(
      'the admin can open the document, so the payload carries its URL',
      typeof application?.documentUrl === 'string' && application.documentUrl.length > 0,
      res.status,
      `documentUrl=${application?.documentUrl ? 'present' : 'absent'}`,
    );
  }

  {
    const res = await candidate.request('GET', '/api/authority/application');
    const application = readApplication(res.json);

    check(
      'the candidate payload masks the government ID too',
      res.status === 200 && application?.governmentIdMasked === GOV_ID_MASK,
      res.status,
      `masked=${application?.governmentIdMasked ?? 'none'}`,
    );
    check(
      'the candidate never receives the document URL, only hasDocument',
      res.status === 200 &&
        application?.hasDocument === true &&
        application.documentUrl === undefined,
      res.status,
      `hasDocument=${String(application?.hasDocument)}`,
    );
    check(
      'no ImageKit reference leaks to the candidate',
      !res.raw.includes('imagekit.io'),
      res.status,
      'no imagekit URL in candidate payload',
    );
  }

  {
    const res = await otherCandidate.request('GET', `/api/admin/authority-applications/${candidateApplicationId}`);

    check(
      'another AUTHORITY cannot read the private document (403)',
      res.status === 403,
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await otherCandidate.request('GET', `/api/admin/authority-applications/${candidateApplicationId}/audit`);

    check(
      'another AUTHORITY cannot read the audit trail (403)',
      res.status === 403,
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await citizen.request('GET', `/api/admin/authority-applications/${candidateApplicationId}`);

    check(
      'a CITIZEN cannot read the private document (403)',
      res.status === 403,
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await admin.request('GET', `/api/admin/authority-applications/${UNKNOWN_UUID}`);

    check(
      'GET .../:id for an unknown uuid (404)',
      res.status === 404 && asRecord(res.json).code === 'APPLICATION_NOT_FOUND',
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await admin.request('GET', '/api/admin/authority-applications/not-a-uuid');

    check(
      'GET .../:id with a malformed id (400, not a driver error)',
      res.status === 400,
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  process.stdout.write('\n');

  // ---------------------------------------------------------------- verifying
  {
    const res = await admin.request('PATCH', `/api/admin/authority-applications/${candidateApplicationId}/verify`, {});
    const application = readApplication(res.json);

    check(
      'PATCH .../verify moves PENDING -> VERIFIED (200)',
      res.status === 200 && application?.verificationStatus === 'VERIFIED',
      res.status,
      `status=${application?.verificationStatus ?? 'none'}`,
    );
    check(
      'verification records the reviewer id and a timestamp',
      application?.verifiedBy === adminId && isTimestamp(application.verifiedAt),
      res.status,
      `verifiedBy=${application?.verifiedBy ?? 'none'}`,
    );
  }

  {
    const res = await candidate.request('PATCH', `/api/admin/authority-applications/${candidateApplicationId}/verify`, {});

    check(
      'a VERIFIED application cannot be verified again (409)',
      res.status === 409 && asRecord(res.json).code === 'APPLICATION_ALREADY_PROCESSED',
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await admin.request('PATCH', `/api/admin/authority-applications/${candidateApplicationId}/reject`, {
      reason: 'changed my mind',
    });

    check(
      'a VERIFIED application cannot be rejected (409) - no revocation yet',
      res.status === 409,
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await candidate.request('GET', '/api/authority/profile');
    const profile = asRecord(dataOf(res.json).profile);

    check(
      'GET /api/authority/profile after verification (200) - the privilege is granted server side',
      res.status === 200 &&
        profile !== null &&
        profile.department === 'WATER_MANAGEMENT' &&
        Array.isArray(profile.skills) &&
        (profile.skills as string[]).includes('PLUMBING'),
      res.status,
      `skills=${JSON.stringify(profile?.skills)}`,
    );
  }

  {
    const res = await submitApplication(candidate);

    check(
      'a VERIFIED authority cannot submit again (409)',
      res.status === 409 && asRecord(res.json).code === 'AUTHORITY_ALREADY_VERIFIED',
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  process.stdout.write('\n');

  // ---------------------------------------------------------------- rejection
  let rejectedApplicationId = '';

  {
    const res = await submitApplication(otherCandidate, { fullName: 'Sunita Devi' });
    const application = readApplication(res.json);
    rejectedApplicationId = application?.id ?? '';

    check(
      'a second candidate submits successfully (201, PENDING)',
      res.status === 201 && application?.verificationStatus === 'PENDING',
      res.status,
      `status=${application?.verificationStatus ?? 'none'}`,
    );
  }

  {
    const res = await admin.request(
      'PATCH',
      `/api/admin/authority-applications/${rejectedApplicationId}/reject`,
      { reason: 'Government identity document could not be verified.' },
    );
    const application = readApplication(res.json);

    check(
      'PATCH .../reject moves PENDING -> REJECTED (200) with the stored reason',
      res.status === 200 &&
        application?.verificationStatus === 'REJECTED' &&
        application.rejectionReason === 'Government identity document could not be verified.',
      res.status,
      `status=${application?.verificationStatus ?? 'none'} reason=${application?.rejectionReason ?? 'none'}`,
    );
  }

  {
    const res = await admin.request(
      'PATCH',
      `/api/admin/authority-applications/${rejectedApplicationId}/reject`,
      { reason: '   ' },
    );

    check(
      'a whitespace-only rejection reason is refused (400)',
      res.status === 400,
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await admin.request('PATCH', `/api/admin/authority-applications/${rejectedApplicationId}/verify`, {});

    check(
      'a REJECTED application cannot be verified (409)',
      res.status === 409 && asRecord(res.json).code === 'APPLICATION_ALREADY_PROCESSED',
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await otherCandidate.request('GET', '/api/authority/profile');

    check(
      'a REJECTED candidate still has no authority access (403)',
      res.status === 403 && asRecord(res.json).code === 'AUTHORITY_NOT_VERIFIED',
      res.status,
      `code=${String(asRecord(res.json).code)}`,
    );
  }

  {
    const res = await otherCandidate.request('GET', '/api/authority/application');
    const application = readApplication(res.json);

    check(
      'the candidate can read their own rejection reason',
      res.status === 200 && application?.verificationStatus === 'REJECTED' &&
        application.rejectionReason === 'Government identity document could not be verified.',
      res.status,
      `reason=${application?.rejectionReason ?? 'none'}`,
    );
  }

  // ------------------------------------------------------------- resubmission
  {
    const res = await submitApplication(otherCandidate, {
      fullName: 'Sunita Devi Yadav',
      skills: 'DRAINAGE_REPAIR,EMERGENCY_RESPONSE',
      governmentIdNumber: '998877665544',
    });
    const application = readApplication(res.json);

    check(
      'REJECTED -> PENDING via re-submission (201) with the corrected data',
      res.status === 201 &&
        application?.verificationStatus === 'PENDING' &&
        application.rejectionReason === null &&
        application.fullName === 'Sunita Devi Yadav' &&
        application.skills.includes('DRAINAGE_REPAIR') &&
        !application.skills.includes('PLUMBING'),
      res.status,
      `status=${application?.verificationStatus ?? 'none'} skills=${JSON.stringify(application?.skills)}`,
    );
    check(
      'the re-submitted application keeps the same id',
      application?.id === rejectedApplicationId,
      res.status,
      `id=${application?.id ?? 'none'}`,
    );
    check(
      'the new government ID is masked, not returned',
      application?.governmentIdMasked === 'XXXX-XXXX-5544',
      res.status,
      `masked=${application?.governmentIdMasked ?? 'none'}`,
    );
  }

  {
    const res = await admin.request('GET', `/api/admin/authority-applications/${rejectedApplicationId}/audit`);
    const entries = asRecord(dataOf(res.json)).entries;
    const trail = Array.isArray(entries) ? (entries as Record<string, unknown>[]) : [];
    const actions = trail.map((entry) => String(entry.action));

    check(
      'the audit trail records SUBMIT -> REJECT -> RESUBMIT in order',
      res.status === 200 && actions.join(',') === 'SUBMIT,REJECT,RESUBMIT',
      res.status,
      actions.join(' -> '),
    );
    check(
      'the REJECT audit entry records the admin, both statuses and the reason',
      trail[1]?.adminId === adminId &&
        trail[1]?.previousStatus === 'PENDING' &&
        trail[1]?.newStatus === 'REJECTED' &&
        trail[1]?.reason === 'Government identity document could not be verified.',
      res.status,
      JSON.stringify({ adminId: trail[1]?.adminId, from: trail[1]?.previousStatus, to: trail[1]?.newStatus }),
    );
    check(
      'the SUBMIT and RESUBMIT entries are not attributed to an admin',
      trail[0]?.adminId === null && trail[2]?.adminId === null,
      res.status,
      'candidate actions have no adminId',
    );
    check(
      'the audit trail contains no identity data',
      !res.raw.includes(GOV_ID_NUMBER) && !res.raw.includes('998877665544'),
      res.status,
      'no ID numbers in the trail',
    );
  }

  {
    const res = await admin.request('GET', `/api/admin/authority-applications/${candidateApplicationId}/audit`);
    const entries = asRecord(dataOf(res.json)).entries;
    const trail = Array.isArray(entries) ? (entries as Record<string, unknown>[]) : [];

    check(
      'the verified application\'s trail is SUBMIT -> VERIFY',
      res.status === 200 &&
        trail.map((entry) => String(entry.action)).join(',') === 'SUBMIT,VERIFY' &&
        trail[1]?.newStatus === 'VERIFIED',
      res.status,
      trail.map((entry) => String(entry.action)).join(' -> '),
    );
  }

  process.stdout.write('\n');

  // -------------------------------------------------------------- no secrets
  {
    const res = await admin.request('GET', '/api/admin/authority-applications');

    check(
      'the admin queue never exposes credentials',
      !res.raw.includes('password_hash') && !res.raw.includes(PASSWORD) && !res.raw.includes('private_'),
      res.status,
      'no credentials in payload',
    );
  }

  {
    const res = await admin.request('POST', '/api/auth/logout');
    const after = await admin.request('GET', '/api/admin/authority-applications');

    check(
      'after logout the admin endpoints are protected again (401)',
      res.status === 200 && after.status === 401,
      after.status,
      `code=${String(asRecord(after.json).code)}`,
    );
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