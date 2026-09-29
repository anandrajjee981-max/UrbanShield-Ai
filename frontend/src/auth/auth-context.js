import { createContext, useContext } from 'react'

/**
 * React context for the authenticated user. Kept apart from the provider
 * component so fast refresh stays enabled during development.
 */
export const AuthContext = createContext(null)

/** Reads the auth state provided by `AuthProvider`. */
export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }

  return context
}
