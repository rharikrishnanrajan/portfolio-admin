import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'

export interface ListEditorProps {
  label?: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
  error?: string | null
  hint?: string
  disabled?: boolean
}

export function ListEditor({
  label,
  items = [],
  onChange,
  placeholder = 'Add an item...',
  error,
  hint,
  disabled = false,
}: ListEditorProps) {
  const handleItemChange = (index: number, value: string) => {
    const next = [...items]
    next[index] = value
    onChange(next)
  }

  const handleAddItem = () => {
    onChange([...items, ''])
  }

  const handleRemoveItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === items.length - 1) return

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    const next = [...items]
    const temp = next[index]
    next[index] = next[targetIndex]
    next[targetIndex] = temp
    onChange(next)
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block font-mono text-xs uppercase tracking-wider text-muted mb-1.5">
          {label}
        </label>
      )}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted w-6 text-right shrink-0">
              {index + 1}.
            </span>
            <input
              type="text"
              value={item}
              onChange={(e) => handleItemChange(index, e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className="input flex-1 py-1.5 text-sm"
            />
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={disabled || index === 0}
                onClick={() => handleMove(index, 'up')}
                className="p-1.5 text-muted hover:text-ink disabled:opacity-30 disabled:hover:text-muted transition-colors border border-line bg-surface"
                aria-label="Move item up"
              >
                <ChevronUp className="size-4" />
              </button>
              <button
                type="button"
                disabled={disabled || index === items.length - 1}
                onClick={() => handleMove(index, 'down')}
                className="p-1.5 text-muted hover:text-ink disabled:opacity-30 disabled:hover:text-muted transition-colors border border-line bg-surface"
                aria-label="Move item down"
              >
                <ChevronDown className="size-4" />
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleRemoveItem(index)}
                className="p-1.5 text-muted hover:text-rose-400 disabled:opacity-30 transition-colors border border-line bg-surface"
                aria-label="Delete item"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          disabled={disabled}
          onClick={handleAddItem}
          className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-line text-xs font-mono uppercase tracking-wider text-muted hover:text-ink hover:border-accent transition-colors disabled:opacity-50"
        >
          <Plus className="size-3.5" />
          <span>Add row</span>
        </button>
      </div>

      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
      {!error && hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}
