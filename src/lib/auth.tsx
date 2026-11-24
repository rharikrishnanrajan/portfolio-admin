import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { useToast } from '../components/ui/Toast'

type AuthState = {
  session: Session | null
  isAdmin: boolean | null // null = still checking
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  signOutAll: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const WARNING_TIMEOUT_MS = 29 * 60 * 1000 // 29 minutes (1 minute warning)
const TAB_HIDDEN_TIMEOUT_MS = 2 * 60 * 60 * 1000 // 2 hours

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const { toast } = useToast()

  const lastActivityRef = useRef<number>(Date.now())
  const warnedRef = useRef<boolean>(false)
  const hiddenSinceRef = useRef<number | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Is this logged-in user listed in the `admins` table?
  const uid = session?.user.id
  useEffect(() => {
    if (!uid) return
    let cancelled = false
    setIsAdmin(null)
    supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', uid)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsAdmin(!!data)
      })
    return () => {
      cancelled = true
    }
  }, [uid])

  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'local' })
  }

  const signOutAll = async () => {
    await supabase.auth.signOut({ scope: 'global' })
  }

  // Idle timeout (30 min with 1 min warning) and Tab-hidden timeout (2 hours)
  useEffect(() => {
    if (!session) return

    lastActivityRef.current = Date.now()
    warnedRef.current = false
    hiddenSinceRef.current = null

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now()
      if (warnedRef.current) {
        warnedRef.current = false
        toast.info('Session activity refreshed.')
      }
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }))

    // Periodic check every 15 seconds
    const interval = setInterval(() => {
      const now = Date.now()
      const idleTime = now - lastActivityRef.current

      if (idleTime >= IDLE_TIMEOUT_MS) {
        void signOut()
        toast.error('Signed out due to 30 minutes of inactivity.')
      } else if (idleTime >= WARNING_TIMEOUT_MS && !warnedRef.current) {
        warnedRef.current = true
        toast.info('You will be signed out in 1 minute due to inactivity. Move mouse or press any key to stay signed in.')
      }
    }, 15_000)

    // Tab visibility listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenSinceRef.current = Date.now()
      } else if (document.visibilityState === 'visible' && hiddenSinceRef.current) {
        const hiddenDuration = Date.now() - hiddenSinceRef.current
        hiddenSinceRef.current = null
        if (hiddenDuration >= TAB_HIDDEN_TIMEOUT_MS) {
          void signOut()
          toast.error('Signed out: tab was hidden for more than 2 hours.')
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity))
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [session, toast])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? error.message : null
  }

  return (
    <Ctx.Provider value={{ session, isAdmin, loading, signIn, signOut, signOutAll }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>')
  return v
}
