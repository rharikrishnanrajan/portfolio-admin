import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
}

export interface ToastContextValue {
  toast: {
    success: (message: string) => void
    error: (message: string) => void
    info: (message: string) => void
  }
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    setToasts((prev) => [...prev, { id, message, type }])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toastMethods = {
    success: useCallback((msg: string) => addToast(msg, 'success'), [addToast]),
    error: useCallback((msg: string) => addToast(msg, 'error'), [addToast]),
    info: useCallback((msg: string) => addToast(msg, 'info'), [addToast]),
  }

  return (
    <ToastContext.Provider value={{ toast: toastMethods }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto card border border-line p-3.5 shadow-2xl flex items-start gap-3 text-sm animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            {t.type === 'success' && (
              <CheckCircle2 className="size-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            {t.type === 'error' && (
              <AlertCircle className="size-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            {t.type === 'info' && (
              <Info className="size-5 text-accent shrink-0 mt-0.5" />
            )}
            <p className="flex-1 text-ink break-words leading-tight">{t.message}</p>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-muted hover:text-ink transition-colors p-0.5"
              aria-label="Dismiss toast"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
