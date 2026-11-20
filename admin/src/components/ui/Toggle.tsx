import { useId } from 'react'

export interface ToggleProps {
  label?: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  id,
}: ToggleProps) {
  const generatedId = useId()
  const toggleId = id || generatedId

  return (
    <div className="flex items-start justify-between gap-4 py-1">
      {(label || description) && (
        <div className="flex-1 cursor-pointer" onClick={() => !disabled && onChange(!checked)}>
          {label && (
            <label
              htmlFor={toggleId}
              className="block text-sm font-medium text-ink cursor-pointer"
            >
              {label}
            </label>
          )}
          {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
        </div>
      )}
      <button
        type="button"
        id={toggleId}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center border border-line transition-colors focus:outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? 'bg-accent/40 border-accent' : 'bg-bg'
        }`}
      >
        <span
          className={`inline-block size-3.5 bg-ink transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}
