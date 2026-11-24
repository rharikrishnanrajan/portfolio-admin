import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Copy,
  Loader2,
  LogOut,
  Plus,
  QrCode,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, useToast } from '../components/ui'

interface TotpFactor {
  id: string
  friendly_name?: string
  factor_type: string
  status: string
  created_at: string
}

interface EnrollData {
  id: string
  totp: {
    qr_code: string
    secret: string
    uri: string
  }
}

export default function Security() {
  const { signOutAll } = useAuth()
  const { toast } = useToast()

  const [factors, setFactors] = useState<TotpFactor[]>([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Unenroll state (requires entering code)
  const [removingFactorId, setRemovingFactorId] = useState<string | null>(null)
  const [unenrollCode, setUnenrollCode] = useState('')
  const [unenrolling, setUnenrolling] = useState(false)

  // Global sign-out state
  const [signingOutAll, setSigningOutAll] = useState(false)

  const loadFactors = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchErr } = await supabase.auth.mfa.listFactors()
      if (fetchErr) throw fetchErr
      const verified = (data?.totp || []).filter((f) => f.status === 'verified')
      setFactors(verified as TotpFactor[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MFA factors')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadFactors()
  }, [])

  const handleStartEnroll = async () => {
    setEnrolling(true)
    setError(null)
    setVerifyCode('')
    try {
      const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Portfolio Admin',
      })
      if (enrollErr) throw enrollErr
      if (!data || !data.totp) throw new Error('Enrollment failed: missing TOTP data')

      setEnrollData(data as EnrollData)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start MFA enrollment'
      setError(msg)
      toast.error(msg)
      setEnrolling(false)
    }
  }

  const handleCancelEnroll = async () => {
    if (enrollData?.id) {
      try {
        await supabase.auth.mfa.unenroll({ factorId: enrollData.id })
      } catch {
        // Ignore unverified cleanup error
      }
    }
    setEnrollData(null)
    setEnrolling(false)
    setVerifyCode('')
    setError(null)
  }

  const handleVerifyEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enrollData) return
    const cleanCode = verifyCode.replace(/\D/g, '').trim()
    if (cleanCode.length !== 6) {
      setError('Please enter the 6-digit code shown in your authenticator app.')
      return
    }

    setVerifying(true)
    setError(null)

    try {
      const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollData.id,
        code: cleanCode,
      })

      if (verifyErr) throw verifyErr

      toast.success('Two-factor authenticator successfully enrolled and verified!')
      setEnrollData(null)
      setEnrolling(false)
      setVerifyCode('')
      await loadFactors()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid verification code'
      setError(msg)
      toast.error(msg)
    } finally {
      setVerifying(false)
    }
  }

  const handleConfirmRemove = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!removingFactorId) return
    const cleanCode = unenrollCode.replace(/\D/g, '').trim()
    if (cleanCode.length !== 6) {
      setError('Please enter your 6-digit authenticator code to confirm removal.')
      return
    }

    setUnenrolling(true)
    setError(null)

    try {
      // 1. Fresh verification before unenroll
      const { error: challengeErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId: removingFactorId,
        code: cleanCode,
      })
      if (challengeErr) throw challengeErr

      // 2. Unenroll factor
      const { error: unenrollErr } = await supabase.auth.mfa.unenroll({
        factorId: removingFactorId,
      })
      if (unenrollErr) throw unenrollErr

      toast.success('Authenticator factor removed.')
      setRemovingFactorId(null)
      setUnenrollCode('')
      await loadFactors()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed. Code was incorrect.'
      setError(msg)
      toast.error(msg)
    } finally {
      setUnenrolling(false)
    }
  }

  const handleSignOutAll = async () => {
    setSigningOutAll(true)
    try {
      await signOutAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sign out of all devices')
      setSigningOutAll(false)
    }
  }

  const copySecret = () => {
    if (enrollData?.totp.secret) {
      navigator.clipboard.writeText(enrollData.totp.secret)
      toast.info('Secret key copied to clipboard')
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Security & Access"
        title="Account Security"
        description="Manage multi-factor authentication (MFA/TOTP), trusted devices, and active sessions."
      />

      {/* Critical Warning Alert */}
      <div className="border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3 text-amber-200">
        <AlertTriangle className="size-5 shrink-0 text-amber-400 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-amber-300">Important MFA Notice:</p>
          <p className="leading-relaxed">
            Supabase Auth does not generate recovery or backup codes. If you enrol an authenticator app, ensure you keep your authenticator backed up or store the manual secret key in a secure password manager.
          </p>
        </div>
      </div>

      {/* MFA Management Section */}
      <section className="card p-6 border-line space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
          <div>
            <p className="eyebrow mb-1">Two-Factor Authentication</p>
            <h2 className="text-lg font-bold text-ink">Authenticator App (TOTP)</h2>
            <p className="text-xs text-muted mt-0.5">
              Secure your account using time-based one-time codes generated by an app on your phone.
            </p>
          </div>

          {!enrolling && !removingFactorId && factors.length === 0 && (
            <button
              type="button"
              onClick={handleStartEnroll}
              className="btn-primary flex items-center gap-2 text-xs py-2 px-3.5 self-start sm:self-auto shrink-0"
            >
              <Plus className="size-4" />
              <span>Enrol Authenticator</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted font-mono text-xs flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin text-accent" />
            <span>Loading authenticators…</span>
          </div>
        ) : enrolling && enrollData ? (
          /* Enrollment Form & QR Code */
          <form onSubmit={handleVerifyEnroll} className="border border-line bg-surface p-6 space-y-6 max-w-lg mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-accent">
                <QrCode className="size-5" />
                <h3 className="font-bold text-sm text-ink">Scan Authenticator QR Code</h3>
              </div>
              <button
                type="button"
                onClick={handleCancelEnroll}
                className="text-muted hover:text-ink p-1"
                aria-label="Cancel"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Open your authenticator app (Google Authenticator, 1Password, Authy, Microsoft Authenticator) and scan the code below.
            </p>

            <div className="p-4 bg-white rounded-sm flex items-center justify-center max-w-55 mx-auto border border-line">
              <img
                src={enrollData.totp.qr_code}
                alt="TOTP QR Code"
                className="w-full h-auto aspect-square object-contain"
              />
            </div>

            <div className="space-y-1.5">
              <span className="eyebrow block">Manual Secret Key</span>
              <div className="flex items-center gap-2 p-2.5 bg-bg border border-line text-xs font-mono">
                <span className="truncate flex-1 tracking-wider text-ink font-semibold">
                  {enrollData.totp.secret}
                </span>
                <button
                  type="button"
                  onClick={copySecret}
                  className="p-1 text-muted hover:text-accent transition-colors"
                  title="Copy secret key"
                >
                  <Copy className="size-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="enroll-code" className="eyebrow block">
                Enter 6-Digit Code to Confirm
              </label>
              <input
                id="enroll-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input text-center text-xl tracking-[0.25em] font-mono py-2 font-bold"
                autoFocus
              />
            </div>

            {error && <p className="text-xs text-rose-400">{error}</p>}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelEnroll}
                className="px-4 py-2 border border-line bg-surface text-xs font-mono uppercase tracking-wider text-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={verifying || verifyCode.length !== 6}
                className="btn-primary flex items-center gap-2 text-xs py-2 px-5 disabled:opacity-50"
              >
                {verifying && <Loader2 className="size-3.5 animate-spin" />}
                <span>{verifying ? 'Activating…' : 'Verify & Activate'}</span>
              </button>
            </div>
          </form>
        ) : removingFactorId ? (
          /* Removal confirmation requiring fresh 6-digit verification */
          <form onSubmit={handleConfirmRemove} className="border border-line bg-surface p-6 space-y-5 max-w-md mx-auto">
            <div className="flex items-center gap-2 text-rose-400">
              <ShieldAlert className="size-5" />
              <h3 className="font-bold text-sm text-ink">Confirm Authenticator Removal</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              To prevent accidental or unauthorized lockout, enter your current 6-digit code from your authenticator app to confirm removal.
            </p>
            <div className="space-y-2">
              <label htmlFor="unenroll-code" className="eyebrow block">
                Current 6-Digit Code
              </label>
              <input
                id="unenroll-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={unenrollCode}
                onChange={(e) => setUnenrollCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input text-center text-xl tracking-[0.25em] font-mono py-2 font-bold"
                autoFocus
              />
            </div>

            {error && <p className="text-xs text-rose-400">{error}</p>}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRemovingFactorId(null)
                  setUnenrollCode('')
                  setError(null)
                }}
                className="px-4 py-2 border border-line bg-surface text-xs font-mono uppercase tracking-wider text-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={unenrolling || unenrollCode.length !== 6}
                className="px-4 py-2 border border-rose-500/40 bg-rose-500/20 text-rose-300 text-xs font-mono uppercase tracking-wider hover:bg-rose-500/30 flex items-center gap-2 disabled:opacity-50"
              >
                {unenrolling && <Loader2 className="size-3.5 animate-spin" />}
                <span>{unenrolling ? 'Removing…' : 'Remove Authenticator'}</span>
              </button>
            </div>
          </form>
        ) : factors.length > 0 ? (
          /* List of Enrolled Factors */
          <div className="space-y-3">
            {factors.map((factor) => (
              <div
                key={factor.id}
                className="flex items-center justify-between p-4 border border-line bg-surface/50"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 border border-line bg-bg text-accent grid place-items-center">
                    <ShieldCheck className="size-5 text-accent" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-ink">
                        {factor.friendly_name || 'TOTP Authenticator'}
                      </span>
                      <span className="font-mono text-[0.65rem] uppercase px-1.5 py-0.5 border border-accent/40 bg-accent/10 text-accent">
                        Active & Verified
                      </span>
                    </div>
                    <p className="text-xs text-muted font-mono mt-0.5">
                      Enrolled: {new Date(factor.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setRemovingFactorId(factor.id)
                    setUnenrollCode('')
                    setError(null)
                  }}
                  className="px-3 py-1.5 border border-line bg-bg text-xs font-mono uppercase tracking-wider text-muted hover:text-rose-400 hover:border-rose-400/50 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="size-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* No Factors Enrolled */
          <div className="border border-line bg-surface/30 p-8 text-center space-y-3">
            <div className="size-10 border border-line bg-bg grid place-items-center mx-auto text-muted">
              <Shield className="size-5" />
            </div>
            <div>
              <p className="font-semibold text-sm text-ink">No two-factor authenticators enrolled</p>
              <p className="text-xs text-muted mt-1 max-w-md mx-auto">
                Add an extra layer of security to your admin account by linking an authenticator app.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartEnroll}
              className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-2"
            >
              <Plus className="size-4" />
              <span>Enrol Authenticator Now</span>
            </button>
          </div>
        )}
      </section>

      {/* Session Management Section */}
      <section className="card p-6 border-line space-y-4">
        <div>
          <p className="eyebrow mb-1">Session Management</p>
          <h2 className="text-lg font-bold text-ink">Active Sessions & Devices</h2>
          <p className="text-xs text-muted mt-0.5">
            Revoke all active refresh tokens and sign out of all sessions across all browsers and devices.
          </p>
        </div>

        <div className="border border-line bg-surface/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-sm font-semibold text-ink">Global Session Sign Out</span>
            <p className="text-xs text-muted">
              Signs out this device as well as any other browser or mobile session currently logged in.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOutAll}
            disabled={signingOutAll}
            className="px-4 py-2 border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs font-mono uppercase tracking-wider hover:bg-rose-500/20 transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
          >
            {signingOutAll ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
            <span>Sign out of all devices</span>
          </button>
        </div>
      </section>
    </div>
  )
}
