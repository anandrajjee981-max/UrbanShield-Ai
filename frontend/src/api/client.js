/**
 * Single fetch wrapper for the backend API.
 *
 * The only thing this file knows about authentication is `credentials:
 * 'include'`: the browser attaches the HTTP-only `access_token` cookie to every
 * request by itself. There is no token to read, no token to store and no
 * Authorization header to set.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

/** Error carrying the `{ success: false, message, code }` envelope from the API. */
export class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

const request = async (path, { method = 'GET', body } = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    // Required: without it the browser drops the authentication cookie.
    credentials: 'include',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(
      payload?.message ?? 'Request failed',
      response.status,
      payload?.code ?? 'UNKNOWN_ERROR',
    )
  }

  return payload
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
}

export { API_BASE_URL }
