import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { register } from '../../api/auth'
import { signedIn } from '../../redux/slices/authSlice.js'
import { ROLE_HOME } from '../../utils/constants.js'
import Button, { ButtonLink } from '../../components/common/Button'
import { Info } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('citizen')
  const [error, setError] = useState('')

  const roles = [
    { value: 'citizen', label: 'Citizen' },
    { value: 'authority', label: 'Authority Officer' },
    { value: 'admin', label: 'Administrator' },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const user = await register({ name, email, password, role })
      dispatch(signedIn(user))
      navigate(ROLE_HOME[user.role] ?? '/citizen', { replace: true })
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto w-full bg-white rounded-2xl shadow-2xl p-8 sm:p-10">

        <h2 className="text-2xl font-bold text-navy-900 text-center mb-6">
          Create account
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
              autocomplete="new-password"
              required
              className="shadow-sm rounded-md border border-navy-300 w-full py-2.5 px-3 text-navy-900 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-navy-600 mb-2">
              Role
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