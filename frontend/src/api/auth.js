/**
 * Auth endpoints. Each call resolves to safe user data only - the JWT is set
 * and cleared by the browser through the HTTP-only `access_token` cookie.
 */

import { api } from './client.js'
import { USE_MOCK } from '../services/api.js'
import { ROLE_LABELS } from '../utils/constants.js'

const getUser = (response) => {
  const user = response?.data?.user ?? response?.user
  if (!user) return null

  const role = user.role?.toLowerCase() ?? 'citizen'
  return { ...user, role, roleLabel: user.roleLabel ?? ROLE_LABELS[role] ?? 'Citizen' }
}

export const register = (payload) =>
  api
    .post('/api/auth/register', {
      ...payload,
      role: payload.role?.toUpperCase(),
    })
    .then(getUser)

export const login = (payload) => api.post('/api/auth/login', payload).then(getUser)

export const logout = async () => {
  try {
    await api.post('/api/auth/logout')
  } catch (error) {
    if (error?.status === 401 || (USE_MOCK && !error?.status)) return
    throw error
  }
}

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
