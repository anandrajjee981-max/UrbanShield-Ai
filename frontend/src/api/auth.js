/**
 * Auth endpoints. Each call resolves to safe user data only - the JWT is set
 * and cleared by the browser through the HTTP-only `access_token` cookie.
 */

import { api } from './client.js'

const getUser = (response) => {
  const user = response?.data?.user
  return user ? { ...user, role: user.role?.toLowerCase() } : null
}

export const register = (payload) =>
  api
    .post('/api/auth/register', {
      ...payload,
      role: payload.role?.toUpperCase(),
    })
    .then(getUser)

export const login = (payload) => api.post('/api/auth/login', payload).then(getUser)

export const logout = () => api.post('/api/auth/logout').then(() => undefined)

/** Returns the current user, or null when the cookie is missing/expired. */
export const fetchCurrentUser = async () => {
  try {
    const res = await api.get('/api/auth/me')
    return getUser(res)
  } catch (error) {
    if (error?.status === 401) return null
    throw error
  }
}
