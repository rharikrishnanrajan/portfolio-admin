import { useId, type TextareaHTMLAttributes } from 'react'

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string | null
  hint?: string
}

export function TextArea({
  label,
  error,
  hint,
  id,
  required,
  rows = 4,
  className = '',
  ...props
}: TextAreaProps) {
  const generatedId = useId()
  const inputId = id || generatedId

  return (
    <div className="w-full">
      <label
        htmlFor={inputId}
        className="block font-mono text-xs uppercase tracking-wider text-muted mb-1.5"
      >
        {label}
        {required && <span className="text-rose-400 ml-1" aria-hidden="true">*</span>}
      </label>
      <textarea
        id={inputId}
        rows={rows}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={`input resize-y min-h-[90px] ${error ? '!border-rose-500' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-rose-400">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
