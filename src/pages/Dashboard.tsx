import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { uploadFile, removeFile } from '../lib/storage'

const STATS = [
  { label: 'Projects', table: 'projects', to: '/projects' },
  { label: 'Skill domains', table: 'skill_domains', to: '/skills' },
  { label: 'Sections', table: 'sections', to: '/sections' },
  { label: 'Certifications', table: 'certifications', to: '/certifications' },
  { label: 'Unread messages', table: 'messages', unread: true, to: '/messages' },
]

type CheckStatus = 'idle' | 'running' | 'pass' | 'fail'

interface CheckResult {
  label: string
  status: CheckStatus
  detail: string
}

/** Extracts a readable message from any thrown value, including Supabase PostgrestError objects. */
function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err !== null && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return String(err)
}

const INITIAL_CHECKS: CheckResult[] = [
  { label: 'Signed-in email', status: 'idle', detail: '' },
  { label: 'Is admin (admins table)', status: 'idle', detail: '' },
  { label: 'Read access (projects count)', status: 'idle', detail: '' },
  { label: 'Write access (site_settings)', status: 'idle', detail: '' },
  { label: 'Storage access (portfolio bucket)', status: 'idle', detail: '' },
]

export default function Dashboard() {
  const [counts, setCounts] = useState<(number | null)[]>(STATS.map(() => null))
  const [contentLastUpdated, setContentLastUpdated] = useState<string | null>(null)
  const [checks, setChecks] = useState<CheckResult[]>(INITIAL_CHECKS)
  const [checkRunning, setCheckRunning] = useState(false)

  useEffect(() => {
    void Promise.all(
      STATS.map(async (s) => {
        const base = supabase.from(s.table).select('*', { count: 'exact', head: true })
        const { count } = s.unread ? await base.eq('is_read', false) : await base
        return count ?? 0
      }),
    ).then(setCounts)

    void supabase
      .from('content_version')
      .select('updated_at')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setContentLastUpdated((data as { updated_at: string }).updated_at)
      })
  }, [])

  const setCheck = (index: number, patch: Partial<CheckResult>) => {
    setChecks((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  const runSystemCheck = async () => {
    setCheckRunning(true)
    setChecks(INITIAL_CHECKS.map((c) => ({ ...c, status: 'running' as CheckStatus })))

    // (a) Signed-in email
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setCheck(0, { status: 'pass', detail: user.email })
      } else {
        setCheck(0, { status: 'fail', detail: 'No user session found' })
      }
    } catch (err) {
      setCheck(0, { status: 'fail', detail: errMsg(err) })
    }

    // (b) Is admin
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user session')
      const { data, error } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) throw error
      if (data) {
        setCheck(1, { status: 'pass', detail: 'Found in admins table' })
      } else {
        setCheck(1, { status: 'fail', detail: 'User id not found in admins table' })
      }
    } catch (err) {
      setCheck(1, { status: 'fail', detail: errMsg(err) })
    }

    // (c) Read: projects count
    try {
      const { count, error } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
      if (error) throw error
      setCheck(2, { status: 'pass', detail: `${count ?? 0} projects readable` })
    } catch (err) {
      setCheck(2, { status: 'fail', detail: errMsg(err) })
    }

    // (d) Write: update site_settings logo_text = logo_text (no-op) and confirm row returned
    try {
      const { data: current, error: fetchErr } = await supabase
        .from('site_settings')
        .select('logo_text')
        .eq('id', 1)
        .single()
      if (fetchErr) throw fetchErr
      const { data: updated, error: updateErr } = await supabase
        .from('site_settings')
        .update({ logo_text: (current as { logo_text: string }).logo_text })
        .eq('id', 1)
        .select('id, updated_at')
      if (updateErr) throw updateErr
      if (!updated || updated.length === 0) throw new Error('Update returned no rows — RLS may be blocking writes')
      const row = updated[0] as { id: number; updated_at: string }
      setCheck(3, { status: 'pass', detail: `updated_at: ${row.updated_at}` })
    } catch (err) {
      setCheck(3, { status: 'fail', detail: errMsg(err) })
    }

    // (e) Storage: upload 1×1 PNG then delete it
    try {
      const timestamp = Date.now()
      const path = `_healthcheck/${timestamp}.png`
      // Minimal valid 1×1 white PNG
      const pngBytes = new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10,
        0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0,
        144, 119, 83, 222,
        0, 0, 0, 12, 73, 68, 65, 84, 8, 215, 99, 248, 15, 0, 0, 1, 1, 0, 5,
        24, 213, 78,
        0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
      ])
      const file = new File([pngBytes], `${timestamp}.png`, { type: 'image/png' })
      const { url } = await uploadFile('portfolio', path, file)
      if (!url) throw new Error('Upload returned no URL')
      await removeFile('portfolio', path)
      setCheck(4, { status: 'pass', detail: 'Upload + delete successful' })
    } catch (err) {
      setCheck(4, { status: 'fail', detail: errMsg(err) })
    }

    setCheckRunning(false)
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    try { return new Date(iso).toLocaleString() } catch { return iso }
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow mb-2">Overview</p>
        <h1 className="text-4xl font-bold tracking-tight mb-1">Dashboard</h1>
        {contentLastUpdated && (
          <p className="text-xs text-muted font-mono">
            Content last updated: <span className="text-ink">{formatDate(contentLastUpdated)}</span>
          </p>
        )}
      </div>

      {/* Stat Cards — each links to its management page */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {STATS.map((s, i) => (
          <Link
            key={s.table + s.label}
            to={s.to}
            className="card p-5 hover:border-accent/50 transition-colors block"
          >
            <p className="eyebrow mb-3">{s.label}</p>
            <p className="font-mono text-4xl">{counts[i] ?? '—'}</p>
          </Link>
        ))}
      </div>

      {/* System Check Card */}
      <section className="card p-6 border-line space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow mb-1">Diagnostics</p>
            <h2 className="text-lg font-bold text-ink">System Check</h2>
            <p className="text-xs text-muted mt-0.5">
              Verifies authentication, admin privileges, read/write database access, and storage.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void runSystemCheck()}
            disabled={checkRunning}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-2 shrink-0 self-start"
          >
            {checkRunning ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            <span>{checkRunning ? 'Running...' : 'Run Check'}</span>
          </button>
        </div>

        <div className="space-y-2">
          {checks.map((check) => (
            <div
              key={check.label}
              className="flex items-start gap-3 p-3 border border-line bg-surface"
            >
              <div className="mt-0.5 shrink-0">
                {check.status === 'idle' && (
                  <div className="size-5 rounded-full border-2 border-line" />
                )}
                {check.status === 'running' && (
                  <Loader2 className="size-5 text-accent animate-spin" />
                )}
                {check.status === 'pass' && (
                  <CheckCircle2 className="size-5 text-emerald-400" />
                )}
                {check.status === 'fail' && (
                  <AlertCircle className="size-5 text-rose-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-ink">{check.label}</span>
                  {check.status === 'pass' && (
                    <span className="font-mono text-[0.65rem] uppercase px-1.5 py-0.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                      PASS
                    </span>
                  )}
                  {check.status === 'fail' && (
                    <span className="font-mono text-[0.65rem] uppercase px-1.5 py-0.5 border border-rose-500/30 bg-rose-500/10 text-rose-400">
                      FAIL
                    </span>
                  )}
                </div>
                {check.detail && (
                  <p className="text-xs text-muted font-mono mt-0.5 break-all">{check.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
