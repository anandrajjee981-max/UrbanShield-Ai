import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { register } from '../../api/auth'
import { signedIn } from '../../redux/slices/authSlice.js'
import { ROLE_HOME } from '../../utils/constants.js'
import Button, { ButtonLink } from '../../components/common/Button'
import { Eye, EyeOff, Info } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState('citizen')
  const [error, setError] = useState('')

  const roles = [
    { value: 'citizen', label: 'Citizen' },
    { value: 'authority', label: 'Authority Officer' },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const user = await register({ name, email, password, role })
      dispatch(signedIn(user))
      navigate(ROLE_HOME[user.role] ?? '/citizen', { replace: true })
    } catch (err) {
      setError(err.errors?.join('. ') || err.message || 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto w-full bg-white rounded-2xl shadow-2xl p-8 sm:p-10">

        <h2 className="text-2xl font-bold text-navy-900 text-center mb-6">
          Create account
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
            <label htmlFor="name" className="block text-sm font-medium text-navy-600 mb-2">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="shadow-sm rounded-md border border-navy-300 w-full py-2.5 px-3 text-navy-900 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

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
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,72}"
                title="Use at least 8 characters, including at least one letter and one number."
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
            <p className="mt-1.5 text-xs text-body">Use at least 8 characters, including one letter and one number.</p>
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-navy-600 mb-2">
              Account type
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="shadow-sm rounded-md border border-navy-300 w-full py-2.5 px-3 text-navy-900 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              {roles.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-body">Admin access is assigned by a platform administrator.</p>
          </div>

          <Button type="submit" className="w-full">
            Create account
          </Button>

          <div className="text-center text-sm">
            Already have an account?
            <ButtonLink to="/login" variant="primary" size="sm">
              Sign in
            </ButtonLink>
          </div>
        </form>
      </div>
    </div>
  )
}