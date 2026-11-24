import { useState, useId, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'

export interface TagInputProps {
  label?: string
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  error?: string | null
  hint?: string
  disabled?: boolean
  id?: string
}

export function TagInput({
  label,
  value = [],
  onChange,
  placeholder = 'Type and press Enter...',
  error,
  hint,
  disabled = false,
  id,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const generatedId = useId()
  const inputId = id || generatedId

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const trimmed = inputValue.trim().replace(/^,+|,+$/g, '')
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed])
        setInputValue('')
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      e.preventDefault()
      onChange(value.slice(0, -1))
    }
  }

  const removeTag = (tagToRemove: string) => {
    if (disabled) return
    onChange(value.filter((t) => t !== tagToRemove))
  }

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block font-mono text-xs uppercase tracking-wider text-muted mb-1.5"
        >
          {label}
        </label>
      )}
      <div
        className={`input flex flex-wrap items-center gap-1.5 min-h-[42px] cursor-text ${
          error ? '!border-rose-500' : ''
        }`}
        onClick={() => document.getElementById(inputId)?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-surface border border-line px-2 py-0.5 font-mono text-xs text-ink"
          >
            <span>{tag}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation()
                removeTag(tag)
              }}
              className="text-muted hover:text-ink transition-colors p-0.5"
              aria-label={`Remove tag ${tag}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={disabled}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-ink placeholder:text-muted"
        />
      </div>
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
      {!error && hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}
