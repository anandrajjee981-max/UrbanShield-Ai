import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { login } from '../../api/auth'
import { signedIn } from '../../redux/slices/authSlice.js'
import { ROLE_HOME } from '../../utils/constants.js'
import Button from '../../components/common/Button'
import { Eye, EyeOff, Info } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const user = await login({ email, password })
      dispatch(signedIn(user))
      navigate(ROLE_HOME[user.role] ?? '/403', { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto w-full bg-white rounded-2xl shadow-2xl p-8 sm:p-10">

        <h2 className="text-2xl font-bold text-navy-900 text-center mb-6">
          Sign in to UrbanShieldAI
        </h2>

        {error && (
          <div role="alert" className="mb-4 rounded-md bg-red-700 p-3 text-sm font-medium text-white shadow-sm">
            <span className="flex items-start">
              <Info className="mr-2 flex h-5 w-5 shrink-0 align-middle text-white" />
              <span>{error}</span>
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-navy-600 mb-2">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="shadow-sm rounded-md border border-navy-300 w-full py-2.5 px-3 text-navy-900 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-navy-600 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="shadow-sm rounded-md border border-navy-300 w-full py-2.5 pl-3 pr-11 text-navy-900 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-body transition hover:text-ink"
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>

        </form>
      </div>
    </div>
  )
}