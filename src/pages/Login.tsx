import { FormEvent, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)

    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (error) setError(error)
    } else {
      const { error } = await signUp(email, password, fullName)
      if (error) setError(error)
      else setInfo('Account created! Check your email to confirm, then sign in.')
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">BoxUp Sales Dashboard</h1>
          <p className="text-slate-500 text-sm">Sign in with your BoxUp Sales account</p>
        </div>

        <div className="card">
          <div className="flex mb-6 rounded-lg bg-slate-100 p-1">
            <button
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                mode === 'signin' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
              }`}
              onClick={() => setMode('signin')}
            >
              Sign In
            </button>
            <button
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                mode === 'signup' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
              }`}
              onClick={() => setMode('signup')}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label">Full name</label>
                <input
                  className="input"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {info && <p className="text-sm text-green-600">{info}</p>}

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
