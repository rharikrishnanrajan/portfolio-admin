import { NavLink, Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { NAV } from '../nav'
import { useAuth } from '../lib/auth'

export default function Layout() {
  const { session, signOut } = useAuth()
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-line bg-surface flex flex-col">
        <div className="flex items-center gap-3 px-5 h-16 border-b border-line">
          <span className="grid place-items-center size-8 border border-line bg-bg font-mono text-xs font-bold">HK</span>
          <span className="font-semibold tracking-tight">Admin</span>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 font-mono text-[0.7rem] uppercase tracking-[0.18em] border-l-2 ${
                  isActive
                    ? 'bg-accent/15 text-ink border-accent'
                    : 'text-muted border-transparent hover:text-ink'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-line">
          <p className="text-xs text-muted truncate mb-3">{session?.user.email}</p>
          <button onClick={signOut} className="flex items-center gap-2 text-xs text-muted hover:text-ink">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-8">
        <Outlet />
      </main>
    </div>
  )
}
