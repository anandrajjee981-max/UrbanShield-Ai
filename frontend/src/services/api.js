import axios from 'axios'

/**
 * Centralised HTTP client.
 *
 * Every network call in the app goes through this instance, so the base URL,
 * the credential policy and the error envelope handling live in exactly one
 * place. Components never see a URL.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

/**
 * The mock layer is opt-in for local demos with `VITE_USE_MOCK=true`.
 * Normal startup uses the backend session and API.
 */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const http = axios.create({
  baseURL: API_BASE_URL,
  // The backend sets an HTTP-only auth cookie; the browser attaches it itself.
  withCredentials: true,
  timeout: 20000,
  headers: { Accept: 'application/json' },
})

http.interceptors.request.use((config) => {
  if (config.body && !(config.body instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json'
  }
  return config
})

/** Normalises Axios / mock rejections into a predictable shape. */
export class ApiError extends Error {
  constructor(message, status = 0, code = 'UNKNOWN_ERROR') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new ApiError('The request timed out. Please try again.', 0, 'TIMEOUT'))
    }

    if (!error.response) {
      return Promise.reject(new ApiError('Cannot reach the server. Check your connection.', 0, 'NETWORK_ERROR'))
    }

    const { status, data } = error.response
    return Promise.reject(new ApiError(data?.message ?? 'Request failed', status, data?.code ?? 'REQUEST_FAILED'))
  },
)

/** Unwraps the `{ success, data }` envelope the backend uses. */
export async function get(path, params) {
  const response = await http.get(path, { params })
  return response.data?.data ?? response.data
}

export async function post(path, body) {
  const response = await http.post(path, body)
  return response.data?.data ?? response.data
}

export async function patch(path, body) {
  const response = await http.patch(path, body)
  return response.data?.data ?? response.data
}

export async function del(path) {
  const response = await http.delete(path)
  return response.data?.data ?? response.data
}

/** Simulated network latency so loading skeletons are actually visible. */
export function fakeLatency(min = 220, max = 520) {
  const duration = min + Math.random() * (max - min)
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}

/** Deep clone helper - the mock layer mutates, so never hand out its objects. */
export function clone(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value))
}
