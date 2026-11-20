import type { ReactNode } from 'react'

export interface PageHeaderProps {
  title: string
  eyebrow?: string
  description?: string
  children?: ReactNode
}

export function PageHeader({ title, eyebrow, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-6 border-b border-line">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink">{title}</h1>
        {description && <p className="text-sm text-muted mt-2 max-w-2xl">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-3 shrink-0">{children}</div>}
    </div>
  )
}
