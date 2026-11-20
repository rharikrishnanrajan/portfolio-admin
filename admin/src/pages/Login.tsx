import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const err = await signIn(email.trim(), password)
    setBusy(false)
    if (err) setError(err)
    else navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={onSubmit} className="card w-full max-w-sm p-8 space-y-5">
        <div>
          <p className="eyebrow mb-2">Admin</p>
          <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
        </div>
        <label className="block space-y-2">
          <span className="eyebrow">Email</span>
          <input className="input" type="email" required autoComplete="username"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block space-y-2">
          <span className="eyebrow">Password</span>
          <input className="input" type="password" required autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
