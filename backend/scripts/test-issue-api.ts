/**
 * End-to-end smoke test for the citizen issue reporting endpoints.
 *
 *   Terminal 1:  npm run dev
 *   Terminal 2:  npm run test:issues
 *
 * Like scripts/test-auth-api.ts, the script acts as a browser with a minimal
 * cookie jar: it stores the `access_token` value from every `Set-Cookie` header
 * and replays it in a `Cookie` header. It never sends an `Authorization` header.
 *
 * Covers: authentication requirement, both location modes, every validation
 * rule, the REPORTED-only status guarantee, multipart image upload to ImageKit
 * (skipped when the credentials are not configured) and "My Reports" scoping.
 *
 * Every request uses a unique email, so the script can be run repeatedly.
 */

import { AUTH_COOKIE_NAME } from '../src/config/auth-cookie.js';
import { env } from '../src/config/env.js';
import { ISSUE_TYPES } from '../src/types/issue.types.js';

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000';

const PASSWORD = 'password123';

const imageKitConfigured = Boolean(env.IMAGEKIT_PUBLIC_KEY && env.IMAGEKIT_PRIVATE_KEY);

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
  setCookie: string;
}

const results: TestResult[] = [];

/** Minimal cookie jar: cookie name -> value, as a browser would keep it. */
let cookieJar = '';

const storeCookie = (setCookieHeader: string): void => {
  const [pair] = setCookieHeader.split(';');
  const [name = '', ...valueParts] = (pair ?? '').split('=');
  const value = valueParts.join('=').trim();

  if (!name) return;

  // `Max-Age=0` / `Expires` in the past means the browser drops the cookie.
  if (/;\s*max-age=0(\D|$)/i.test(setCookieHeader)) {
    cookieJar = cookieJar
      .split('; ')
      .filter((entry) => entry.split('=')[0] !== name)
      .join('; ');
    return;
  }

  const entry = `${name}=${value}`;
  const otherEntries = cookieJar.split('; ').filter((item) => item && item.split('=')[0] !== name);

  cookieJar = [...otherEntries, entry].join('; ');
};

const request = async (
  method: string,
  path: string,
  body?: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<TestResponse> => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(cookieJar ? { Cookie: cookieJar } : {}),
      ...extraHeaders,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const raw = await response.text();
  const setCookie = response.headers.getSetCookie().find((header) => header.startsWith(`${AUTH_COOKIE_NAME}=`)) ?? '';

  if (setCookie) {
    storeCookie(setCookie);
  }

  let json: unknown = raw;

  try {
    json = JSON.parse(raw);
  } catch {
    /* keep the raw text */
  }

  return { status: response.status, json, raw, setCookie };
};

const check = (name: string, passed: boolean, status: number, detail: string): void => {
  results.push({ name, passed, status, detail });
  const mark = passed ? 'PASS' : 'FAIL';
  process.stdout.write(`[${mark}] ${name} (${status}) - ${detail}\n`);
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const dataOf = (json: unknown): Record<string, unknown> => asRecord(asRecord(json).data);

interface IssuePayload {
  id: string;
  issueType: string;
  description: string;
  imageUrl: string | null;
  locationType: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  status: string;
}

const readIssue = (json: unknown): IssuePayload | null => {
  const issue = asRecord(dataOf(json).issue);

  return typeof issue.id === 'string' ? (issue as unknown as IssuePayload) : null;
};

const readIssues = (json: unknown): IssuePayload[] => {
  const issues = dataOf(json).issues;

  return Array.isArray(issues) ? (issues as IssuePayload[]) : [];
};

/**
 * Smallest valid PNG, built in memory so the test needs no fixture file.
 * Copied into a plain Uint8Array so it is accepted as a `BlobPart`.
 */
const onePixelPng = (): Uint8Array<ArrayBuffer> =>
  new Uint8Array(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    ),
  );

const postMultipart = async (path: string, fields: Record<string, string>, file?: { name: string; type: string }): Promise<TestResponse> => {
  const form = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }

  if (file) {
    form.append('image', new Blob([onePixelPng()], { type: file.type }), file.name);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { ...(cookieJar ? { Cookie: cookieJar } : {}) },
    body: form,
  });

  const raw = await response.text();

  let json: unknown = raw;

  try {
    json = JSON.parse(raw);
  } catch {
    /* keep the raw text */
  }

  return { status: response.status, json, raw, setCookie: '' };
};

const uniqueEmail = (): string => `citizen.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;

const main = async (): Promise<void> => {
  process.stdout.write(`Testing ${BASE_URL} (citizen issue reporting)\n`);

  if (!imageKitConfigured) {
    process.stdout.write('ImageKit credentials are not configured - image upload checks are skipped\n');
  }

  process.stdout.write('\n');

  // 1. register a citizen (also logs them in via the cookie)
  let userId = '';

  {
    const res = await request('POST', '/api/auth/register', {
      name: 'Issue Citizen',
      email: uniqueEmail(),
      password: PASSWORD,
      role: 'CITIZEN',
    });

    const user = asRecord(dataOf(res.json).user);
    userId = typeof user.id === 'string' ? user.id : '';

    check('POST /api/auth/register (201)', res.status === 201 && userId.length > 0, res.status, `userId=${userId || 'none'}`);
  }

  // 2. unauthenticated create -> 401
  {
    const saved = cookieJar;
    cookieJar = '';
    const res = await request('POST', '/api/issues', {
      issueType: 'WATER_LEAKAGE',
      description: 'Water has been leaking from this pipe for two days.',
      locationType: 'MANUAL',
      address: 'Example Area, Ranchi, Jharkhand',
    });
    cookieJar = saved;

    check(
      'POST /api/issues without cookie (401)',
      res.status === 401 && asRecord(res.json).code === 'MISSING_TOKEN',
      res.status,
      `message="${asRecord(res.json).message}"`,
    );
  }

  // 3. unauthenticated list -> 401
  {
    const saved = cookieJar;
    cookieJar = '';
    const res = await request('GET', '/api/issues/my');
    cookieJar = saved;

    check('GET /api/issues/my without cookie (401)', res.status === 401, res.status, `code=${asRecord(res.json).code}`);
  }

  // 4. GPS issue -> 201, REPORTED, coordinates stored
  {
    const res = await request('POST', '/api/issues', {
      issueType: 'WATER_LEAKAGE',
      description: 'Water has been leaking from this pipe for the last two days.',
      locationType: 'GPS',
      latitude: 23.3441,
      longitude: 85.3096,
    });

    const issue = readIssue(res.json);

    check(
      'POST /api/issues GPS (201)',
      res.status === 201 && issue !== null,
      res.status,
      `id=${issue?.id ?? 'none'}`,
    );
    check(
      'GPS issue keeps latitude/longitude and status REPORTED',
      issue?.latitude === 23.3441 && issue?.longitude === 85.3096 && issue?.status === 'REPORTED' && issue?.locationType === 'GPS',
      res.status,
      `lat=${issue?.latitude} lng=${issue?.longitude} status=${issue?.status}`,
    );
    check('GPS issue has no address', issue?.address === null, res.status, `address=${String(issue?.address)}`);
  }

  // 5. MANUAL issue -> 201, address stored, no coordinates
  {
    const res = await request('POST', '/api/issues', {
      issueType: 'WATER_SHORTAGE',
      description: 'There has been no water supply in this area for a week.',
      locationType: 'MANUAL',
      address: 'Example Area, Ranchi, Jharkhand',
    });

    const issue = readIssue(res.json);

    check('POST /api/issues MANUAL (201)', res.status === 201 && issue !== null, res.status, `id=${issue?.id ?? 'none'}`);
    check(
      'MANUAL issue stores the address and no coordinates',
      issue?.address === 'Example Area, Ranchi, Jharkhand' && issue?.latitude === null && issue?.longitude === null,
      res.status,
      `address="${issue?.address ?? 'none'}" lat=${String(issue?.latitude)}`,
    );
    check('MANUAL issue status is REPORTED', issue?.status === 'REPORTED', res.status, `status=${issue?.status}`);
  }

  // 6. description is trimmed and stored verbatim (no AI rewriting)
  {
    const text = '   Extreme heat in the market area, people are fainting.   ';
    const res = await request('POST', '/api/issues', {
      issueType: 'EXTREME_HEAT',
      description: text,
      locationType: 'MANUAL',
      address: 'Market Area, Ranchi',
    });

    const issue = readIssue(res.json);

    check(
      'description is trimmed and stored as sent',
      res.status === 201 && issue?.description === text.trim(),
      res.status,
      `description="${issue?.description ?? 'none'}"`,
    );
  }

  // 7. every issue type in the enum is accepted
  {
    let allAccepted = true;
    let lastStatus = 0;

    for (const issueType of ISSUE_TYPES) {
      const res = await request('POST', '/api/issues', {
        issueType,
        description: `Automated check for ${issueType}.`,
        locationType: 'MANUAL',
        address: 'Test Location, Ranchi',
      });

      lastStatus = res.status;

      if (res.status !== 201) {
        allAccepted = false;
        process.stdout.write(`    ${issueType} -> ${res.status} ${res.raw}\n`);
      }
    }

    check(`all ${ISSUE_TYPES.length} issue types accepted (201)`, allAccepted, lastStatus, ISSUE_TYPES.join(', '));
  }

  // 8. invalid payloads -> 400 VALIDATION_ERROR
  const invalidPayloads: Array<{ name: string; body: unknown }> = [
    {
      name: 'GPS without latitude/longitude',
      body: { issueType: 'FLOODING', description: 'Water is entering the house.', locationType: 'GPS' },
    },
    {
      name: 'GPS with latitude only',
      body: { issueType: 'FLOODING', description: 'Water is entering the house.', locationType: 'GPS', latitude: 23.34 },
    },
    {
      name: 'MANUAL without address',
      body: { issueType: 'DRAINAGE', description: 'The drain is blocked.', locationType: 'MANUAL' },
    },
    {
      name: 'unknown locationType',
      body: { issueType: 'OTHER', description: 'Something is wrong.', locationType: 'SATELLITE' },
    },
    {
      name: 'latitude above 90',
      body: { issueType: 'OTHER', description: 'Out of range.', locationType: 'GPS', latitude: 91, longitude: 10 },
    },
    {
      name: 'latitude below -90',
      body: { issueType: 'OTHER', description: 'Out of range.', locationType: 'GPS', latitude: -90.5, longitude: 10 },
    },
    {
      name: 'longitude above 180',
      body: { issueType: 'OTHER', description: 'Out of range.', locationType: 'GPS', latitude: 10, longitude: 180.1 },
    },
    {
      name: 'longitude below -180',
      body: { issueType: 'OTHER', description: 'Out of range.', locationType: 'GPS', latitude: 10, longitude: -181 },
    },
    {
      name: 'non numeric coordinates',
      body: { issueType: 'OTHER', description: 'Bad coords.', locationType: 'GPS', latitude: 'abc', longitude: 10 },
    },
    {
      name: 'empty description',
      body: { issueType: 'OTHER', description: '    ', locationType: 'MANUAL', address: 'Somewhere' },
    },
    {
      name: 'missing description',
      body: { issueType: 'OTHER', locationType: 'MANUAL', address: 'Somewhere' },
    },
    {
      name: 'unknown issueType',
      body: { issueType: 'ALIEN_INVASION', description: 'Nope.', locationType: 'MANUAL', address: 'Somewhere' },
    },
    {
      name: 'GPS combined with an address',
      body: { issueType: 'FLOODING', description: 'Mixed.', locationType: 'GPS', latitude: 23.34, longitude: 85.3, address: 'Ranchi' },
    },
    {
      name: 'caller supplied status',
      body: { issueType: 'OTHER', description: 'Trying to skip the queue.', locationType: 'MANUAL', address: 'Somewhere', status: 'VERIFIED' },
    },
    {
      name: 'caller supplied userId',
      body: { issueType: 'OTHER', description: 'Trying to impersonate.', locationType: 'MANUAL', address: 'Somewhere', userId: '00000000-0000-0000-0000-000000000000' },
    },
  ];

  for (const payload of invalidPayloads) {
    const res = await request('POST', '/api/issues', payload.body);

    check(
      `POST /api/issues rejects ${payload.name} (400)`,
      res.status === 400 && res.raw.includes('VALIDATION_ERROR'),
      res.status,
      `code=${asRecord(res.json).code}`,
    );
  }

  // 9. GPS boundary values are accepted (-90/90, -180/180)
  {
    const res = await request('POST', '/api/issues', {
      issueType: 'OTHER',
      description: 'Boundary coordinates check.',
      locationType: 'GPS',
      latitude: -90,
      longitude: 180,
    });

    check('POST /api/issues accepts boundary coordinates (201)', res.status === 201, res.status, `code=${asRecord(res.json).code}`);
  }

  // 10. GET /api/issues/my returns this citizen's issues, newest first
  {
    const res = await request('GET', '/api/issues/my');
    const issues = readIssues(res.json);

    check('GET /api/issues/my (200)', res.status === 200 && issues.length > 0, res.status, `count=${issues.length}`);

    const allMine = issues.every((issue) => typeof issue.id === 'string' && issue.status === 'REPORTED');
    check('every returned issue is a REPORTED issue of this citizen', allMine, res.status, `${issues.length} issues`);

    const timestamps = issues.map((issue) => Date.parse(String((issue as unknown as { createdAt: string }).createdAt)));
    const sortedNewestFirst = timestamps.every((value, index) => index === 0 || (timestamps[index - 1] ?? 0) >= value);
    check('issues are ordered newest first', sortedNewestFirst, res.status, `order verified over ${timestamps.length} items`);

    check('response hides userId and image_file_id', !res.raw.includes('userId') && !res.raw.includes('imageFileId') && !res.raw.includes(userId), res.status, 'no internal fields leaked');
    check('response never contains ImageKit credentials', !res.raw.includes('private_') && !res.raw.includes(env.IMAGEKIT_PRIVATE_KEY), res.status, 'no credentials in payload');
  }

  // 11. a second citizen sees none of the first citizen's issues
  {
    const saved = cookieJar;
    cookieJar = '';

    await request('POST', '/api/auth/register', {
      name: 'Other Citizen',
      email: uniqueEmail(),
      password: PASSWORD,
      role: 'CITIZEN',
    });

    const res = await request('GET', '/api/issues/my');
    const issues = readIssues(res.json);

    cookieJar = saved;

    check('GET /api/issues/my is scoped to the caller (0 issues)', res.status === 200 && issues.length === 0, res.status, `count=${issues.length}`);
  }

  // 12. GET /api/issues/my ignores a userId query parameter
  {
    const res = await request('GET', `/api/issues/my?userId=${userId}`);
    const issues = readIssues(res.json);

    check('GET /api/issues/my ignores a userId query param', res.status === 200 && issues.length > 0, res.status, `count=${issues.length}`);
  }

  // 13. multipart issue with an ImageKit photo -> 201 with an imageUrl
  if (imageKitConfigured) {
    {
      const res = await postMultipart(
        '/api/issues',
        {
          issueType: 'DRAINAGE',
          description: 'The storm drain is blocked and the street floods.',
          locationType: 'MANUAL',
          address: 'Drainage Area, Ranchi',
        },
        { name: 'drain.jpg', type: 'image/jpeg' },
      );

      const issue = readIssue(res.json);

      check(
        'POST /api/issues multipart with photo (201)',
        res.status === 201 && issue !== null,
        res.status,
        `imageUrl=${issue?.imageUrl ?? 'none'}`,
      );
      check(
        'photo produces an ImageKit URL and the issue is still REPORTED',
        typeof issue?.imageUrl === 'string' && issue.imageUrl.length > 0 && issue.status === 'REPORTED',
        res.status,
        `url=${issue?.imageUrl ?? 'none'}`,
      );
    }

    // 14. multipart GPS coordinates arrive as strings and are coerced
    {
      const res = await postMultipart(
        '/api/issues',
        {
          issueType: 'WATER_LEAKAGE',
          description: 'Leak reported with a photo and GPS fix.',
          locationType: 'GPS',
          latitude: '23.3441',
          longitude: '85.3096',
        },
        { name: 'leak.png', type: 'image/png' },
      );

      const issue = readIssue(res.json);

      check(
        'POST /api/issues multipart GPS (201) with coerced coordinates',
        res.status === 201 && issue?.latitude === 23.3441 && issue?.longitude === 85.3096,
        res.status,
        `lat=${issue?.latitude} lng=${issue?.longitude}`,
      );
    }

    // 15. blank multipart coordinates must not be coerced to 0
    {
      const res = await postMultipart('/api/issues', {
        issueType: 'FLOODING',
        description: 'Blank coordinate fields must be rejected.',
        locationType: 'GPS',
        latitude: '',
        longitude: '',
      });

      check(
        'POST /api/issues rejects blank multipart coordinates (400)',
        res.status === 400 && res.raw.includes('VALIDATION_ERROR'),
        res.status,
        `code=${asRecord(res.json).code}`,
      );
    }

    // 16. a non image upload is rejected
    {
      const res = await postMultipart(
        '/api/issues',
        { issueType: 'OTHER', description: 'PDF attached.', locationType: 'MANUAL', address: 'Ranchi' },
        { name: 'doc.pdf', type: 'application/pdf' },
      );

      check(
        'POST /api/issues rejects a non image upload (400)',
        res.status === 400 && asRecord(res.json).code === 'UNSUPPORTED_IMAGE_TYPE',
        res.status,
        `code=${asRecord(res.json).code}`,
      );
    }

    // 17. an oversized photo is rejected
    {
      const form = new FormData();
      form.append('issueType', 'OTHER');
      form.append('description', 'Oversized photo.');
      form.append('locationType', 'MANUAL');
      form.append('address', 'Ranchi');
      const oversized = new Uint8Array(new ArrayBuffer(env.ISSUE_IMAGE_MAX_BYTES + 1024));
      form.append('image', new Blob([oversized], { type: 'image/png' }), 'big.png');

      const response = await fetch(`${BASE_URL}/api/issues`, {
        method: 'POST',
        headers: { ...(cookieJar ? { Cookie: cookieJar } : {}) },
        body: form,
      });

      const raw = await response.text();
      const json = asRecord(JSON.parse(raw) as unknown);

      check(
        'POST /api/issues rejects an oversized photo (400)',
        response.status === 400 && json.code === 'IMAGE_TOO_LARGE',
        response.status,
        `code=${String(json.code)}`,
      );
    }

    // 18. multipart with an unexpected field name is rejected
    {
      const form = new FormData();
      form.append('issueType', 'OTHER');
      form.append('description', 'Wrong field name.');
      form.append('locationType', 'MANUAL');
      form.append('address', 'Ranchi');
      form.append('photo', new Blob([onePixelPng()], { type: 'image/png' }), 'wrong.png');

      const response = await fetch(`${BASE_URL}/api/issues`, {
        method: 'POST',
        headers: { ...(cookieJar ? { Cookie: cookieJar } : {}) },
        body: form,
      });

      const json = asRecord((await response.json()) as unknown);

      check(
        'POST /api/issues rejects an unexpected file field (400)',
        response.status === 400 && json.code === 'UNEXPECTED_FILE_FIELD',
        response.status,
        `code=${String(json.code)}`,
      );
    }
  }

  // 19. a JSON create without a photo is still valid
  {
    const res = await request('POST', '/api/issues', {
      issueType: 'OTHER',
      description: 'No photo attached, JSON request.',
      locationType: 'MANUAL',
      address: 'Ranchi',
    });

    const issue = readIssue(res.json);

    check('POST /api/issues without a photo (201)', res.status === 201 && issue?.imageUrl === null, res.status, `imageUrl=${String(issue?.imageUrl)}`);
  }

  // 20. malformed JSON -> 400
  {
    const response = await fetch(`${BASE_URL}/api/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(cookieJar ? { Cookie: cookieJar } : {}) },
      body: '{"issueType":',
    });

    const json = (await response.json()) as unknown;

    check('POST /api/issues malformed JSON (400)', response.status === 400, response.status, `code=${asRecord(json).code}`);
  }

  // 21. unknown route -> 404
  {
    const res = await request('GET', '/api/issues/does-not-exist');

    check('GET /api/issues/does-not-exist (404)', res.status === 404, res.status, `code=${asRecord(res.json).code}`);
  }

  // 22. logout, then the endpoints are protected again
  {
    await request('POST', '/api/auth/logout');

    const res = await request('GET', '/api/issues/my');
    check('GET /api/issues/my after logout (401)', res.status === 401, res.status, `message="${asRecord(res.json).message}"`);
  }

  const failed = results.filter((result) => !result.passed);
  process.stdout.write(`\n${results.length - failed.length}/${results.length} checks passed\n`);

  if (failed.length > 0) {
    process.stdout.write(`Failed: ${failed.map((result) => result.name).join(', ')}\n`);
    process.exitCode = 1;
  }
};

main().catch((error: unknown) => {
  process.stderr.write(`Test run failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
