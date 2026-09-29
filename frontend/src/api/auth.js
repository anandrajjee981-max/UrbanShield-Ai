/**
 * Auth endpoints. Each call resolves to safe user data only - the JWT is set
 * and cleared by the browser through the HTTP-only `access_token` cookie.
 */

import { api } from './client.js'

export const register = (payload) => api.post('/api/auth/register', payload).then((res) => res.data.user)

export const login = (payload) => api.post('/api/auth/login', payload).then((res) => res.data.user)

export const logout = () => api.post('/api/auth/logout').then(() => undefined)

/** Returns the current user, or null when the cookie is missing/expired. */
export const fetchCurrentUser = async () => {
  try {
    const res = await api.get('/api/auth/me')
    return res.data.user
  } catch (error) {
    if (error?.status === 401) return null
    throw error
  }
}
