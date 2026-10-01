import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { login } from '../../api/auth'
import { signedIn } from '../../redux/slices/authSlice.js'
import { ROLE_HOME } from '../../utils/constants.js'
import Button, { ButtonLink } from '../../components/common/Button'
import { Info } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const user = await login({ email, password })
      dispatch(signedIn(user))
      navigate(ROLE_HOME[user.role] ?? '/citizen', { replace: true })
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
          <div className="mb-4 p-3 rounded bg-risk-high text-risk-high text-sm">
            <span className="flex items-start">
              <Info className="flex h-5 w-5 shrink-0 mr-2 text-risk-high align-middle opacity-100" />
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
              autocomplete="email"
              required
              className="shadow-sm rounded-md border border-navy-300 w-full py-2.5 px-3 text-navy-900 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-navy-600 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autocomplete="current-password"
              required
              className="shadow-sm rounded-md border border-navy-300 w-full py-2.5 px-3 text-navy-900 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>

          <div className="text-center text-sm">
            <ButtonLink to="/citizen" variant="ghost" size="sm">
              Continue as guest
            </ButtonLink>
          </div>
        </form>
      </div>
    </div>
  )
}