import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchCurrentUser, login as loginRequest, logout as logoutRequest, register as registerRequest } from '../api/auth.js'
import { AuthContext } from './auth-context.js'

/**
 * Authentication state.
 *
 * The token lives only in the HTTP-only cookie, so there is nothing to
 * restore from localStorage on start up: the app asks `GET /api/auth/me` and
 * the backend answers from the cookie the browser sent automatically. Reloading
 * the page therefore keeps the user signed in.
 */

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // 'loading' until the first /me call settles, so protected UI does not flash
  // the signed-out state on a hard refresh.
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    fetchCurrentUser()
      .then((currentUser) => {
        if (!active) return
        setUser(currentUser)
        setStatus(currentUser ? 'authenticated' : 'unauthenticated')
      })
      .catch(() => {
        if (!active) return
        setUser(null)
        setStatus('unauthenticated')
      })

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (credentials) => {
    setError(null)

    try {
      const authenticatedUser = await loginRequest(credentials)
      setUser(authenticatedUser)
      setStatus('authenticated')
      return authenticatedUser
    } catch (loginError) {
      setError(loginError)
      throw loginError
    }
  }, [])

  const register = useCallback(async (payload) => {
    setError(null)

    try {
      const registeredUser = await registerRequest(payload)
      setUser(registeredUser)
      setStatus('authenticated')
      return registeredUser
    } catch (registerError) {
      setError(registerError)
      throw registerError
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      setUser(null)
      setStatus('unauthenticated')
    }
  }, [])

  const value = useMemo(
    () => ({ user, status, error, isAuthenticated: status === 'authenticated', login, register, logout }),
    [user, status, error, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
