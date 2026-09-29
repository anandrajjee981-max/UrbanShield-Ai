/**
 * End-to-end smoke test for the cookie-based authentication endpoints.
 *
 *   Terminal 1:  npm run dev
 *   Terminal 2:  npm run test:api
 *
 * The script acts as a browser with a minimal cookie jar: it stores the
 * `access_token` value from every `Set-Cookie` header and replays it in a
 * `Cookie` header. It never sends an `Authorization` header, which is exactly
 * what the frontend does now.
 *
 * Every request uses a unique email, so the script can be run repeatedly.
 */

import jwt from 'jsonwebtoken';
import { AUTH_COOKIE_NAME } from '../src/config/auth-cookie.js';
import { env } from '../src/config/env.js';

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000';

const PASSWORD = 'password123';

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

interface UserPayload {
  id: string;
  name: string;
  email: string;
  role: string;
}

const readUser = (json: unknown): UserPayload | null => {
  const user = asRecord(dataOf(json).user);

  return typeof user.id === 'string' && typeof user.email === 'string' ? (user as unknown as UserPayload) : null;
};

/** Signs a token with the real secret that expired `secondsAgo` seconds ago. */
const signExpiredToken = (userId: string, role: string, secondsAgo: number): string =>
  jwt.sign({ userId, role }, env.JWT_SECRET, {
    algorithm: 'HS256',
    issuer: 'climate-smart-city-api',
    audience: 'climate-smart-city-client',
    subject: userId,
    expiresIn: -secondsAgo,
  });

const uniqueEmail = (): string => `anand.${Date.now()}@example.com`;

/** Reads the raw JWT value back out of the jar (a browser never exposes it). */
const readCookieValue = (jar: string): string => {
  const entry = jar.split('; ').find((item) => item.startsWith(`${AUTH_COOKIE_NAME}=`)) ?? '';
  return entry.slice(AUTH_COOKIE_NAME.length + 1);
};

const main = async (): Promise<void> => {
  process.stdout.write(`Testing ${BASE_URL} (cookie authentication)\n\n`);

  let email = uniqueEmail();
  let userId = '';

  // 1. health
  {
    const res = await request('GET', '/health');
    check('GET /health', res.status === 200, res.status, `status ${res.status}`);
  }

  // 2. register -> sets the cookie, returns no token
  {
    const res = await request('POST', '/api/auth/register', {
      name: 'Anand Raj',
      email,
      password: PASSWORD,
      role: 'CITIZEN',
    });
    const user = readUser(res.json);
    userId = user?.id ?? '';

    check(
      'POST /api/auth/register (201)',
      res.status === 201 && Boolean(user),
      res.status,
      `user=${user?.email ?? 'none'}`,
    );
    check(
      'register sets access_token cookie',
      res.setCookie.startsWith(`${AUTH_COOKIE_NAME}=`) && cookieJar.length > 0,
      res.status,
      `${res.setCookie.split(';')[0] ?? 'none'}`,
    );
    check(
      'register cookie is HttpOnly + SameSite=Lax',
      /;\s*httponly/i.test(res.setCookie) && /;\s*samesite=lax/i.test(res.setCookie),
      res.status,
      res.setCookie,
    );
    check(
      'register response hides token, password_hash and password',
      !res.raw.includes('password_hash') && !res.raw.includes(PASSWORD) && !/"token"/i.test(res.raw),
      res.status,
      'body contains only safe user data',
    );
  }

  // 3. register logs the user in: the cookie works immediately
  {
    const res = await request('GET', '/api/auth/me');
    const user = readUser(res.json);
    check(
      'GET /api/auth/me with register cookie (200)',
      res.status === 200 && user?.email === email,
      res.status,
      `user=${user?.email ?? 'none'}`,
    );
  }

  // 4. duplicate email -> 409
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

  // 5. invalid payload -> 400
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

  // 6. logout the register session
  {
    const res = await request('POST', '/api/auth/logout');
    check(
      'POST /api/auth/logout clears the cookie (200)',
      res.status === 200 && res.setCookie.length > 0 && !/;\s*max-age=\d*[1-9]/i.test(res.setCookie),
      res.status,
      `${res.setCookie.split(';')[0] ?? 'no clear header'} (jar=${cookieJar || 'empty'})`,
    );
    check('cookie jar is empty after logout', cookieJar === '', res.status, `jar=${cookieJar || 'empty'}`);
  }

  // 7. login -> sets a fresh cookie
  {
    const res = await request('POST', '/api/auth/login', { email, password: PASSWORD });
    const user = readUser(res.json);

    check(
      'POST /api/auth/login (200)',
      res.status === 200 && user?.email === email,
      res.status,
      `user=${user?.email ?? 'none'}`,
    );
    check(
      'login sets access_token cookie',
      res.setCookie.startsWith(`${AUTH_COOKIE_NAME}=`) && /;\s*path=\//i.test(res.setCookie),
      res.status,
      res.setCookie,
    );
    check(
      'login response hides token, password_hash and password',
      !res.raw.includes('password_hash') && !res.raw.includes(PASSWORD) && !/"token"/i.test(res.raw),
      res.status,
      'body contains only safe user data',
    );
  }

  // 8. wrong password -> 401
  {
    const res = await request('POST', '/api/auth/login', { email, password: 'wrong-password' });
    check(
      'POST /api/auth/login wrong password (401)',
      res.status === 401 && asRecord(res.json).message === 'Invalid credentials',
      res.status,
      `message="${asRecord(res.json).message}"`,
    );
  }

  // 9. unknown email -> 401 (same message, no user enumeration)
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

  // 10. missing password -> 400
  {
    const res = await request('POST', '/api/auth/login', { email });
    check('POST /api/auth/login missing password (400)', res.status === 400, res.status, 'password is required');
  }

  // 11. protected route with the session cookie
  {
    const res = await request('GET', '/api/auth/me');
    const user = readUser(res.json);
    check(
      'GET /api/auth/me (200)',
      res.status === 200 && user?.email === email,
      res.status,
      `user=${user?.email ?? 'none'}`,
    );
    check('GET /api/auth/me hides password_hash', !res.raw.includes('password_hash'), res.status, 'no hash in payload');
  }

  // 12. no cookie at all -> 401 "Authentication required"
  {
    const saved = cookieJar;
    cookieJar = '';
    const res = await request('GET', '/api/auth/me');
    cookieJar = saved;
    check(
      'GET /api/auth/me without cookie (401)',
      res.status === 401 && asRecord(res.json).message === 'Authentication required',
      res.status,
      `message="${asRecord(res.json).message}"`,
    );
  }

  // 13. tampered cookie -> 401 "Invalid or expired authentication"
  {
    const saved = cookieJar;
    cookieJar = `${AUTH_COOKIE_NAME}=not-a-jwt`;
    const res = await request('GET', '/api/auth/me');
    cookieJar = saved;
    check(
      'GET /api/auth/me invalid cookie (401)',
      res.status === 401 && asRecord(res.json).message === 'Invalid or expired authentication',
      res.status,
      `message="${asRecord(res.json).message}"`,
    );
  }

  // 14. structurally valid but wrongly signed cookie -> 401
  {
    const saved = cookieJar;
    cookieJar = `${AUTH_COOKIE_NAME}=${readCookieValue(saved).slice(0, -2)}xy`;
    const res = await request('GET', '/api/auth/me');
    cookieJar = saved;
    check(
      'GET /api/auth/me tampered signature (401)',
      res.status === 401 && asRecord(res.json).message === 'Invalid or expired authentication',
      res.status,
      `code=${asRecord(res.json).code}`,
    );
  }

  // 15. genuinely expired cookie -> 401
  {
    const saved = cookieJar;
    cookieJar = `${AUTH_COOKIE_NAME}=${signExpiredToken(userId, 'CITIZEN', 60)}`;
    const res = await request('GET', '/api/auth/me');
    cookieJar = saved;
    check(
      'GET /api/auth/me expired cookie (401)',
      res.status === 401 && asRecord(res.json).message === 'Invalid or expired authentication',
      res.status,
      `message="${asRecord(res.json).message}"`,
    );
  }

  // 16. the token in an Authorization header is ignored: cookie-only
  {
    const saved = cookieJar;
    const token = readCookieValue(saved);
    cookieJar = '';
    const res = await request('GET', '/api/auth/me', undefined, { Authorization: `Bearer ${token}` });
    cookieJar = saved;
    check(
      'GET /api/auth/me with Bearer header only (401)',
      res.status === 401,
      res.status,
      'bearer tokens are not accepted',
    );
  }

  // 17. logout
  {
    const res = await request('POST', '/api/auth/logout');
    check(
      'POST /api/auth/logout (200)',
      res.status === 200 && asRecord(res.json).message === 'Logout successful',
      res.status,
      `message="${asRecord(res.json).message}"`,
    );
  }

  // 18. GET /me after logout -> 401 (the browser dropped the cookie)
  {
    const res = await request('GET', '/api/auth/me');
    check(
      'GET /api/auth/me after logout (401)',
      res.status === 401,
      res.status,
      `message="${asRecord(res.json).message}"`,
    );
  }

  // 19. logout without a cookie -> 401 (route stays protected)
  {
    cookieJar = '';
    const res = await request('POST', '/api/auth/logout');
    check('POST /api/auth/logout no cookie (401)', res.status === 401, res.status, 'middleware protects logout');
  }

  // 20. unknown route -> 404
  {
    const res = await request('GET', '/api/auth/does-not-exist');
    check('GET /api/auth/does-not-exist (404)', res.status === 404, res.status, `code=${asRecord(res.json).code}`);
  }

  // 21. malformed JSON -> 400
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

  // 22. CORS preflight allows the frontend origin with credentials
  {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
      },
    });
    check(
      'CORS preflight from FRONTEND_URL allows credentials',
      response.status === 204 &&
        response.headers.get('access-control-allow-origin') === 'http://localhost:5173' &&
        response.headers.get('access-control-allow-credentials') === 'true',
      response.status,
      `allow-origin=${response.headers.get('access-control-allow-origin')} allow-credentials=${response.headers.get('access-control-allow-credentials')}`,
    );
  }

  // 23. CORS preflight from an unknown origin is blocked
  {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://evil.example.com',
        'Access-Control-Request-Method': 'POST',
      },
    });
    check(
      'CORS preflight from unknown origin is blocked',
      response.headers.get('access-control-allow-origin') === null,
      response.status,
      `allow-origin=${response.headers.get('access-control-allow-origin') ?? 'none'}`,
    );
  }

  // 24. role AUTHORITY can be registered
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

  // 25. role defaults to CITIZEN
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
