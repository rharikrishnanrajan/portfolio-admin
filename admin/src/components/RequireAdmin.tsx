import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'

function Screen({ children }: { children: ReactNode }) {
  return <div className="min-h-screen grid place-items-center p-6 text-center">{children}</div>
}

export default function RequireAdmin() {
  const { session, isAdmin, loading, signOut } = useAuth()

  if (loading || (session && isAdmin === null)) {
    return <Screen><p className="eyebrow">Checking access…</p></Screen>
  }
  if (!session) return <Navigate to="/login" replace />
  if (!isAdmin) {
    return (
      <Screen>
        <div className="card p-8 max-w-md">
          <p className="eyebrow mb-2">Access denied</p>
          <p className="mb-6 text-muted">
            {session.user.email} is signed in but is not listed in the admins table.
          </p>
          <button className="btn-primary" onClick={signOut}>Sign out</button>
        </div>
      </Screen>
    )
  }
  return <Outlet />
}
