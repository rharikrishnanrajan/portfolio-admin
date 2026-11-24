import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: LucideIcon
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: EmptyStateProps) {
  return (
    <div className="card p-12 text-center flex flex-col items-center justify-center border-dashed">
      <div className="p-3 border border-line bg-bg mb-3 text-muted">
        <Icon className="size-6" />
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="text-sm text-muted max-w-sm mt-1">{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="btn-primary mt-5 text-xs py-2 px-4"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
