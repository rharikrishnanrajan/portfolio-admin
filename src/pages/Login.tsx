import { useState, useEffect, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth'

function friendlyError(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  return 'Email or password is incorrect'
}

export default function Login() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [failedCount, setFailedCount] = useState(0)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)

  // Countdown timer for exponential backoff
  useEffect(() => {
    if (lockoutSeconds <= 0) return
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => (prev > 1 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [lockoutSeconds])

  if (session) return <Navigate to="/" replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (lockoutSeconds > 0 || busy) return

    setBusy(true)
    setError(null)
    const err = await signIn(email.trim(), password)
    setBusy(false)

    if (err) {
      const nextFailures = failedCount + 1
      setFailedCount(nextFailures)
      setError(friendlyError(err))

      // Exponential backoff after 3 consecutive failures
      if (nextFailures >= 3) {
        const backoff = Math.min(30, Math.pow(2, nextFailures - 3) * 2)
        setLockoutSeconds(backoff)
      }
    } else {
      setFailedCount(0)
      navigate('/', { replace: true })
    }
  }

  const isLocked = lockoutSeconds > 0
  const isButtonDisabled = busy || isLocked

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={onSubmit} className="card w-full max-w-sm p-8 space-y-5" noValidate>
        <div>
          <p className="eyebrow mb-2">Admin</p>
          <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
        </div>
        <label className="block space-y-2">
          <span className="eyebrow">Email</span>
          <input
            id="login-email"
            className="input"
            type="email"
            required
            autoComplete="username"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </label>
        <label className="block space-y-2">
          <span className="eyebrow">Password</span>
          <input
            id="login-password"
            className="input"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </label>
        {error && (
          <p id="login-error" role="alert" className="text-sm text-rose-400">
            {error}
          </p>
        )}
        <button
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          disabled={isButtonDisabled}
        >
          {busy && <Loader2 className="size-3.5 animate-spin" />}
          <span>
            {busy
              ? 'Signing in…'
              : isLocked
              ? `Please wait ${lockoutSeconds}s…`
              : 'Sign in'}
          </span>
        </button>
      </form>
    </div>
  )
}
