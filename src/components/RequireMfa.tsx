import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import MfaChallenge from './MfaChallenge'

export default function RequireMfa() {
  const { session, signOut } = useAuth()
  const [checking, setChecking] = useState(true)
  const [needsMfa, setNeedsMfa] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)

  useEffect(() => {
    if (!session) {
      setChecking(false)
      return
    }

    let cancelled = false

    const checkAssuranceLevel = async () => {
      try {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (error || !data) {
          if (!cancelled) setChecking(false)
          return
        }

        // Check if an MFA factor is enrolled (nextLevel is aal2) but current session is only aal1
        if (data.nextLevel === 'aal2' && data.currentLevel === 'aal1') {
          const { data: factors } = await supabase.auth.mfa.listFactors()
          const verifiedTotp = factors?.totp?.find((f) => f.status === 'verified')
          if (verifiedTotp && !cancelled) {
            setFactorId(verifiedTotp.id)
            setNeedsMfa(true)
          }
        }
      } catch {
        // Non-blocking in case of network issue
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    void checkAssuranceLevel()

    return () => {
      cancelled = true
    }
  }, [session])

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <p className="eyebrow text-muted">Checking authentication assurance…</p>
      </div>
    )
  }

  if (needsMfa && factorId) {
    return (
      <MfaChallenge
        factorId={factorId}
        onSuccess={() => setNeedsMfa(false)}
        onSignOut={signOut}
      />
    )
  }

  return <Outlet />
}
