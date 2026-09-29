/**
 * End-to-end smoke test for the authentication endpoints.
 *
 *   Terminal 1:  npm run dev
 *   Terminal 2:  npm run test:api
 *
 * Every request uses a unique email, so the script can be run repeatedly.
 */

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000';

const PASSWORD = 'password123';

interface TestResult {
  name: string;
  passed: boolean;
  status: number;
  detail: string;
}

const results: TestResult[] = [];

const request = async (
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; json: unknown; raw: string }> => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const raw = await response.text();
  let json: unknown = raw;

  try {
    json = JSON.parse(raw);
  } catch {
    /* keep the raw text */
  }

  return { status: response.status, json, raw };
};

const check = (
  name: string,
  passed: boolean,
  status: number,
  detail: string,
): void => {
  results.push({ name, passed, status, detail });
  const mark = passed ? 'PASS' : 'FAIL';
  process.stdout.write(`[${mark}] ${name} (${status}) - ${detail}\n`);
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const dataOf = (json: unknown): Record<string, unknown> => asRecord(asRecord(json).data);

interface UserPayload {
  id: string;
  name: string;
  email: string;
  role: string;
}

const readUser = (json: unknown): UserPayload | null => {
  const data = dataOf(json);
  const user = asRecord(data.user);

  return typeof user.id === 'string' && typeof user.email === 'string' ? (user as unknown as UserPayload) : null;
};

const readToken = (json: unknown): string | null => {
  const token = dataOf(json).token;
  return typeof token === 'string' ? token : null;
};

const uniqueEmail = (): string => `anand.${Date.now()}@example.com`;

const main = async (): Promise<void> => {
  process.stdout.write(`Testing ${BASE_URL}\n\n`);

  let token = '';
  let email = uniqueEmail();

  // 1. health
  {
    const res = await request('GET', '/health');
    check('GET /health', res.status === 200, res.status, `status ${res.status}`);
  }

  // 2. register
  {
    const res = await request('POST', '/api/auth/register', {
      name: 'Anand Raj',
      email,
      password: PASSWORD,
      role: 'CITIZEN',
    });
    const user = readUser(res.json);
    token = readToken(res.json) ?? '';

    check(
      'POST /api/auth/register (201)',
      res.status === 201 && Boolean(user) && token.length > 20,
      res.status,
      `user=${user?.email ?? 'none'} token=${token ? 'issued' : 'missing'}`,
    );
    check(
      'register response hides password_hash',
      !res.raw.includes('password_hash') && !res.raw.includes(PASSWORD),
      res.status,
      'no hash or password in payload',
    );
  }

  // 3. register with a different case for the same email -> 409
  {
    const res = await request('POST', '/api/auth/register', {
      name: 'Anand Raj',
      email: email.toUpperCase(),
      password: PASSWORD,
      role: 'CITIZEN',
    });
    check(
      'POST /api/auth/register duplicate email (409)',
      res.status === 409,
      res.status,
      `message="${asRecord(res.json).message}"`,
    );
  }

  // 4. register invalid payload -> 400
  {
    const res = await request('POST', '/api/auth/register', {
      name: 'A',
      email: 'not-an-email',
      password: 'short',
      role: 'SUPERUSER',
    });
    const errors = asRecord(res.json).errors;
    check(
      'POST /api/auth/register validation (400)',
      res.status === 400 && res.raw.includes('VALIDATION_ERROR'),
      res.status,
      `errors=${Array.isArray(errors) ? errors.length : 0}`,
    );
  }

  // 5. login
  {
    const res = await request('POST', '/api/auth/login', { email, password: PASSWORD });
    const user = readUser(res.json);
    token = readToken(res.json) ?? '';

    check(
      'POST /api/auth/login (200)',
      res.status === 200 && user?.email === email && token.length > 20,
      res.status,
      `user=${user?.email ?? 'none'}`,
    );
    check(
      'login response hides password_hash',
      !res.raw.includes('password_hash') && !res.raw.includes(PASSWORD),
      res.status,
      'no hash or password in payload',
    );
  }

  // 6. login with wrong password -> 401
  {
    const res = await request('POST', '/api/auth/login', { email, password: 'wrong-password' });
    check(
      'POST /api/auth/login wrong password (401)',
      res.status === 401 && asRecord(res.json).message === 'Invalid credentials',
      res.status,
      `message="${asRecord(res.json).message}"`,
    );
  }

  // 7. login with unknown email -> 401 (same message, no user enumeration)
  {
    const res = await request('POST', '/api/auth/login', {
      email: 'nobody.here@example.com',
      password: PASSWORD,
    });
    check(
      'POST /api/auth/login unknown email (401)',
      res.status === 401 && asRecord(res.json).message === 'Invalid credentials',
      res.status,
      `message="${asRecord(res.json).message}"`,
    );
  }

  // 8. login missing fields -> 400
  {
    const res = await request('POST', '/api/auth/login', { email });
    check('POST /api/auth/login missing password (400)', res.status === 400, res.status, 'password is required');
  }

  // 9. GET /me with a valid token
  {
    const res = await request('GET', '/api/auth/me', undefined, token);
    const user = readUser(res.json);
    check(
      'GET /api/auth/me (200)',
      res.status === 200 && user?.email === email,
      res.status,
      `user=${user?.email ?? 'none'}`,
    );
    check(
      'GET /api/auth/me hides password_hash',
      !res.raw.includes('password_hash'),
      res.status,
      'no hash in payload',
    );
  }

  // 10. GET /me without a token -> 401
  {
    const res = await request('GET', '/api/auth/me');
    check('GET /api/auth/me no token (401)', res.status === 401, res.status, `message="${asRecord(res.json).message}"`);
  }

  // 11. GET /me with a tampered token -> 401
  {
    const res = await request('GET', '/api/auth/me', undefined, `${token}tampered`);
    check('GET /api/auth/me tampered token (401)', res.status === 401, res.status, `code=${asRecord(res.json).code}`);
  }

  // 12. GET /me with a bad scheme -> 401
  {
    const response = await fetch(`${BASE_URL}/api/auth/me`, { headers: { Authorization: `Basic ${token}` } });
    const json = (await response.json()) as unknown;
    check(
      'GET /api/auth/me wrong scheme (401)',
      response.status === 401,
      response.status,
      `code=${asRecord(json).code}`,
    );
  }

  // 13. POST /logout
  {
    const res = await request('POST', '/api/auth/logout', undefined, token);
    check('POST /api/auth/logout (200)', res.status === 200, res.status, `message="${asRecord(res.json).message}"`);
  }

  // 14. POST /logout without a token -> 401
  {
    const res = await request('POST', '/api/auth/logout');
    check('POST /api/auth/logout no token (401)', res.status === 401, res.status, 'middleware protects logout');
  }

  // 15. unknown route -> 404
  {
    const res = await request('GET', '/api/auth/does-not-exist');
    check('GET /api/auth/does-not-exist (404)', res.status === 404, res.status, `code=${asRecord(res.json).code}`);
  }

  // 16. malformed JSON -> 400
  {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"email":',
    });
    const json = (await response.json()) as unknown;
    check(
      'POST /api/auth/login malformed JSON (400)',
      response.status === 400,
      response.status,
      `code=${asRecord(json).code}`,
    );
  }

  // 17. role AUTHORITY can be registered
  {
    const res = await request('POST', '/api/auth/register', {
      name: 'City Authority',
      email: uniqueEmail(),
      password: PASSWORD,
      role: 'AUTHORITY',
    });
    const user = readUser(res.json);
    check(
      'POST /api/auth/register AUTHORITY (201)',
      res.status === 201 && user?.role === 'AUTHORITY',
      res.status,
      `role=${user?.role ?? 'none'}`,
    );
  }

  // 18. role defaults to CITIZEN
  {
    const res = await request('POST', '/api/auth/register', {
      name: 'Default Role',
      email: uniqueEmail(),
      password: PASSWORD,
    });
    const user = readUser(res.json);
    check(
      'POST /api/auth/register default role (201)',
      res.status === 201 && user?.role === 'CITIZEN',
      res.status,
      `role=${user?.role ?? 'none'}`,
    );
  }

  // summary
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
