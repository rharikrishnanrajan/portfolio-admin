import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STATS = [
  { label: 'Projects', table: 'projects' },
  { label: 'Skill domains', table: 'skill_domains' },
  { label: 'Sections', table: 'sections' },
  { label: 'Certifications', table: 'certifications' },
  { label: 'Unread messages', table: 'messages', unread: true },
]

export default function Dashboard() {
  const [counts, setCounts] = useState<(number | null)[]>(STATS.map(() => null))

  useEffect(() => {
    Promise.all(
      STATS.map(async (s) => {
        const base = supabase.from(s.table).select('*', { count: 'exact', head: true })
        const { count } = s.unread ? await base.eq('is_read', false) : await base
        return count ?? 0
      }),
    ).then(setCounts)
  }, [])

  return (
    <div>
      <p className="eyebrow mb-2">Overview</p>
      <h1 className="text-4xl font-bold tracking-tight mb-8">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {STATS.map((s, i) => (
          <div key={s.table + s.label} className="card p-5">
            <p className="eyebrow mb-3">{s.label}</p>
            <p className="font-mono text-4xl">{counts[i] ?? '—'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
