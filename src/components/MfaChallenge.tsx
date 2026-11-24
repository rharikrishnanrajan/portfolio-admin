import { useState, type FormEvent } from 'react'
import { KeyRound, Loader2, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface MfaChallengeProps {
  factorId: string
  onSuccess: () => void
  onSignOut: () => void
}

export default function MfaChallenge({ factorId, onSuccess, onSignOut }: MfaChallengeProps) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const cleanCode = code.replace(/\D/g, '').trim()
    if (cleanCode.length !== 6) {
      setError('Please enter a 6-digit authentication code.')
      return
    }

    setBusy(true)
    setError(null)

    try {
      const { data, error: challengeErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: cleanCode,
      })

      if (challengeErr) throw challengeErr
      if (!data) throw new Error('Verification failed. Please try again.')

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid authentication code. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm p-8 space-y-6" noValidate>
        <div className="text-center">
          <div className="size-12 rounded-full border border-line bg-surface grid place-items-center mx-auto mb-3 text-accent">
            <KeyRound className="size-6" />
          </div>
          <p className="eyebrow mb-1">Security Verification</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Two-Factor Authentication</h1>
          <p className="text-xs text-muted mt-1.5 leading-relaxed">
            Enter the 6-digit security code from your authenticator app to continue.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="mfa-code" className="eyebrow block">
            Verification Code
          </label>
          <input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            disabled={busy}
            className="input text-center text-2xl tracking-[0.3em] font-mono py-2.5 font-bold"
            aria-describedby={error ? 'mfa-error' : undefined}
          />
        </div>

        {error && (
          <p id="mfa-error" role="alert" className="text-xs text-rose-400 text-center">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary w-full flex items-center justify-center gap-2"
          disabled={busy || code.length !== 6}
        >
          {busy && <Loader2 className="size-3.5 animate-spin" />}
          <span>{busy ? 'Verifying…' : 'Verify and Continue'}</span>
        </button>

        <div className="pt-2 border-t border-line text-center">
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors font-mono"
          >
            <LogOut className="size-3" />
            <span>Cancel and sign out</span>
          </button>
        </div>
      </form>
    </div>
  )
}
