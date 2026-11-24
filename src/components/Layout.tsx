import { NavLink, Outlet } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NAV } from '../nav'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import ErrorBoundary from './ErrorBoundary'

export default function Layout() {
  const { session, signOut } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const fetchUnread = () => {
      void (async () => {
        try {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('is_read', false)
          setUnreadCount(count ?? 0)
        } catch {
          // silent — badge simply won't update
        }
      })()
    }
    fetchUnread()
    const timer = setInterval(fetchUnread, 60_000)
    return () => clearInterval(timer)
  }, [])

  // Close drawer when route changes (via click on a nav item)
  const handleNavClick = () => setSidebarOpen(false)

  const sidebar = (
    <aside className="w-64 shrink-0 border-r border-line bg-surface flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-line">
        <span className="grid place-items-center size-8 border border-line bg-bg font-mono text-xs font-bold">HK</span>
        <span className="font-semibold tracking-tight flex-1">Admin</span>
        {/* Close button — only visible in drawer mode */}
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="md:hidden p-1 text-muted hover:text-ink transition-colors"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 font-mono text-[0.7rem] uppercase tracking-[0.18em] border-l-2 ${
                isActive
                  ? 'bg-accent/15 text-ink border-accent'
                  : 'text-muted border-transparent hover:text-ink'
              }`
            }
          >
            <Icon size={16} />
            <span className="flex-1">{label}</span>
            {to === '/messages' && unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-sm bg-accent text-bg font-mono text-[0.6rem] font-bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
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
  )

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — always visible on md+ */}
      <div className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:fixed md:inset-y-0 md:z-30">
        {sidebar}
      </div>

      {/* Mobile drawer overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-bg/70 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col md:hidden transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebar}
      </div>

      {/* Main content — offset for desktop sidebar */}
      <div className="flex-1 md:ml-64 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-line bg-surface sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-muted hover:text-ink transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <span className="font-semibold tracking-tight text-sm">Admin</span>
        </div>

        <main className="flex-1 min-w-0 p-6 md:p-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
