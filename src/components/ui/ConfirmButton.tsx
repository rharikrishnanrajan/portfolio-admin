import { useState, type ReactNode } from 'react'
import { AlertTriangle, Check, Loader2, Trash2, X } from 'lucide-react'

export interface ConfirmButtonProps {
  onConfirm: () => void | Promise<void>
  confirmText?: string
  confirmButtonText?: string
  cancelButtonText?: string
  children?: ReactNode
  className?: string
  disabled?: boolean
  variant?: 'danger' | 'default'
}

export function ConfirmButton({
  onConfirm,
  confirmText = 'Are you sure?',
  confirmButtonText = 'Yes, delete',
  cancelButtonText = 'Cancel',
  children,
  className = '',
  disabled = false,
  variant = 'danger',
}: ConfirmButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleConfirm = async () => {
    try {
      setBusy(true)
      await onConfirm()
      setIsConfirming(false)
    } finally {
      setBusy(false)
    }
  }

  if (isConfirming) {
    return (
      <div className="inline-flex items-center gap-1.5 p-1 bg-surface border border-line text-xs animate-in fade-in duration-150">
        <span className="flex items-center gap-1 text-muted font-mono px-1">
          <AlertTriangle className="size-3 text-rose-400" />
          <span>{confirmText}</span>
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={handleConfirm}
          className="px-2 py-1 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-mono text-[0.7rem] uppercase tracking-wider transition-colors flex items-center gap-1 border border-rose-500/40 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
          <span>{confirmButtonText}</span>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setIsConfirming(false)}
          className="px-2 py-1 bg-bg text-muted hover:text-ink font-mono text-[0.7rem] uppercase tracking-wider transition-colors flex items-center gap-1 border border-line disabled:opacity-50"
        >
          <X className="size-3" />
          <span>{cancelButtonText}</span>
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setIsConfirming(true)}
      className={
        className ||
        (variant === 'danger'
          ? 'p-1.5 text-muted hover:text-rose-400 transition-colors border border-line bg-surface disabled:opacity-30'
          : 'p-1.5 text-muted hover:text-ink transition-colors border border-line bg-surface disabled:opacity-30')
      }
      aria-label="Delete"
    >
      {children || <Trash2 className="size-4" />}
    </button>
  )
}
