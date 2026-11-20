import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

type AuthState = {
  session: Session | null
  isAdmin: boolean | null // null = still checking
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Is this logged-in user listed in the `admins` table? (RLS lets a user read only their own row.)
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

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? error.message : null
  }
  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <Ctx.Provider value={{ session, isAdmin, loading, signIn, signOut }}>{children}</Ctx.Provider>
  )
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>')
  return v
}
