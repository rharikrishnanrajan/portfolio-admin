import { useEffect, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useCrud } from '../lib/useCrud'
import {
  PageHeader,
  Field,
  Toggle,
  ConfirmButton,
  EmptyState,
  useToast,
} from '../components/ui'
import type { CompetencyRow, OverviewRow, SectionRow } from '../types/rows'

interface HighlightItem {
  label: string
  value: string
}

export default function About() {
  const { toast } = useToast()

  // 1. SECTION CONTENT STATE ('about' section)
  const [sectionRow, setSectionRow] = useState<SectionRow | null>(null)
  const [overviewTitle, setOverviewTitle] = useState('')
  const [competenciesTitle, setCompetenciesTitle] = useState('')
  const [highlights, setHighlights] = useState<HighlightItem[]>([])
  const [loadingSection, setLoadingSection] = useState(true)
  const [savingSection, setSavingSection] = useState(false)
  const [sectionError, setSectionError] = useState<string | null>(null)

  // 2. OVERVIEW ROWS STATE (overview_rows table)
  const {
    rows: overviewRows,
    loading: loadingOverview,
    error: overviewError,
    save: saveOverview,
    remove: removeOverview,
    move: moveOverview,
    toggle: toggleOverview,
  } = useCrud<OverviewRow>('overview_rows', { orderBy: 'position', ascending: true })

  const [editingOverview, setEditingOverview] = useState<Partial<OverviewRow> | null>(null)
  const [savingOverview, setSavingOverview] = useState(false)
  const [overviewFormError, setOverviewFormError] = useState<string | null>(null)

  // 3. COMPETENCIES STATE (competencies table)
  const {
    rows: competencies,
    loading: loadingCompetencies,
    error: competenciesError,
    save: saveCompetency,
    remove: removeCompetency,
    move: moveCompetency,
    toggle: toggleCompetency,
  } = useCrud<CompetencyRow>('competencies', { orderBy: 'position', ascending: true })

  const [editingCompetency, setEditingCompetency] = useState<Partial<CompetencyRow> | null>(null)
  const [savingCompetency, setSavingCompetency] = useState(false)
  const [competencyFormError, setCompetencyFormError] = useState<string | null>(null)

  // Fetch initial 'about' section content
  useEffect(() => {
    const fetchSection = async () => {
      setLoadingSection(true)
      setSectionError(null)
      try {
        const { data, error } = await supabase
          .from('sections')
          .select('*')
          .eq('slug', 'about')
          .maybeSingle()

        if (error) throw error

        if (data) {
          const row = data as SectionRow
          setSectionRow(row)
          const content = (row.content as Record<string, unknown>) || {}
          setOverviewTitle((content.overview_title as string) || '')
          setCompetenciesTitle((content.competencies_title as string) || '')
          if (Array.isArray(content.highlights)) {
            setHighlights(
              content.highlights.map((h: unknown) => {
                const item = h as Record<string, unknown>
                return {
                  label: String(item.label || ''),
                  value: String(item.value || ''),
                }
              })
            )
          } else {
            setHighlights([])
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setSectionError(msg)
      } finally {
        setLoadingSection(false)
      }
    }

    void fetchSection()
  }, [])

  // Save 'about' section content (preserving existing unknown keys)
  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSection(true)
    setSectionError(null)

    try {
      // Re-fetch fresh section data to safely merge
      let currentContent: Record<string, unknown> = {}
      let targetId = sectionRow?.id

      const { data: fresh } = await supabase
        .from('sections')
        .select('*')
        .eq('slug', 'about')
        .maybeSingle()

      if (fresh) {
        const row = fresh as SectionRow
        targetId = row.id
        currentContent = (row.content as Record<string, unknown>) || {}
      }

      const mergedContent: Record<string, unknown> = {
        ...currentContent,
        overview_title: overviewTitle.trim(),
        competencies_title: competenciesTitle.trim(),
        highlights: highlights
          .map((h) => ({ label: h.label.trim(), value: h.value.trim() }))
          .filter((h) => h.label || h.value),
      }

      if (targetId) {
        const { data, error } = await supabase
          .from('sections')
          .update({ content: mergedContent })
          .eq('id', targetId)
          .select()

        if (error) throw error
        if (!data || data.length === 0) {
          throw new Error('No row was updated. Check your permissions and try again.')
        }
      } else {
        const { data: created, error } = await supabase
          .from('sections')
          .insert({
            slug: 'about',
            type: 'about',
            nav_label: 'About',
            title: 'About Me',
            position: 10,
            visible: true,
            show_in_nav: true,
            content: mergedContent,
          })
          .select()
          .single()

        if (error) throw error
        if (!created) {
          throw new Error('No row was inserted. Check your permissions and try again.')
        }
        setSectionRow(created as SectionRow)
      }

      toast.success('About section content saved.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setSectionError(msg)
      toast.error(msg)
    } finally {
      setSavingSection(false)
    }
  }

  // Highlights repeater controls
  const handleAddHighlight = () => {
    setHighlights([...highlights, { label: '', value: '' }])
  }

  const handleRemoveHighlight = (index: number) => {
    setHighlights(highlights.filter((_, i) => i !== index))
  }

  const handleUpdateHighlight = (index: number, field: 'label' | 'value', value: string) => {
    const next = [...highlights]
    next[index] = { ...next[index], [field]: value }
    setHighlights(next)
  }

  const handleMoveHighlight = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === highlights.length - 1) return
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    const next = [...highlights]
    const temp = next[index]
    next[index] = next[targetIdx]
    next[targetIdx] = temp
    setHighlights(next)
  }

  // OVERVIEW ROWS CRUD HANDLERS
  const handleSaveOverview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingOverview) return

    setOverviewFormError(null)
    if (!editingOverview.label?.trim()) {
      setOverviewFormError('Label is required.')
      return
    }
    if (!editingOverview.value?.trim()) {
      setOverviewFormError('Value is required.')
      return
    }

    setSavingOverview(true)
    try {
      await saveOverview({
        ...editingOverview,
        label: editingOverview.label.trim(),
        value: editingOverview.value.trim(),
        visible: editingOverview.visible ?? true,
      })
      toast.success(editingOverview.id ? 'Overview row updated.' : 'Overview row created.')
      setEditingOverview(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setOverviewFormError(msg)
    } finally {
      setSavingOverview(false)
    }
  }

  const handleDeleteOverview = async (id: string) => {
    try {
      await removeOverview(id)
      toast.success('Overview row deleted.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Failed to delete: ${msg}`)
    }
  }

  // COMPETENCIES CRUD HANDLERS
  const handleSaveCompetency = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCompetency) return

    setCompetencyFormError(null)
    if (!editingCompetency.text?.trim()) {
      setCompetencyFormError('Competency text is required.')
      return
    }

    setSavingCompetency(true)
    try {
      await saveCompetency({
        ...editingCompetency,
        text: editingCompetency.text.trim(),
        visible: editingCompetency.visible ?? true,
      })
      toast.success(editingCompetency.id ? 'Competency updated.' : 'Competency created.')
      setEditingCompetency(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setCompetencyFormError(msg)
    } finally {
      setSavingCompetency(false)
    }
  }

  const handleDeleteCompetency = async (id: string) => {
    try {
      await removeCompetency(id)
      toast.success('Competency deleted.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Failed to delete: ${msg}`)
    }
  }

  return (
    <div className="space-y-10 max-w-4xl">
      <PageHeader
        eyebrow="Biography & Core Profile"
        title="About"
        description="Manage your about section headlines, key metric highlights, overview facts, and core competencies."
      />

      {/* SECTION 1: SECTION HEADLINES & HIGHLIGHTS REPEATER */}
      <section className="card p-6 border-line space-y-6">
        <div>
          <p className="eyebrow mb-1">Section Content</p>
          <h2 className="text-lg font-bold text-ink">Headlines & Highlights</h2>
          <p className="text-xs text-muted mt-0.5">
            Titles and stat callouts stored in the <code className="font-mono text-accent">sections</code> table (<code className="font-mono text-accent">slug: about</code>).
          </p>
        </div>

        {loadingSection ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="size-6 text-accent animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSaveSection} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Overview Title"
                value={overviewTitle}
                onChange={(e) => setOverviewTitle(e.target.value)}
                placeholder="e.g. Overview, Summary, At a Glance"
              />
              <Field
                label="Competencies Title"
                value={competenciesTitle}
                onChange={(e) => setCompetenciesTitle(e.target.value)}
                placeholder="e.g. Core Competencies, Key Capabilities"
              />
            </div>

            {/* Highlights repeater */}
            <div className="space-y-3 pt-2 border-t border-line">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-muted">
                    Key Highlights / Metrics ({highlights.length})
                  </p>
                  <p className="text-xs text-muted">
                    Repeater items rendered as highlight stats (e.g. Experience: 10+ Years).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddHighlight}
                  className="px-2.5 py-1.5 border border-dashed border-line text-xs font-mono uppercase tracking-wider text-muted hover:text-ink hover:border-accent transition-colors flex items-center gap-1.5"
                >
                  <Plus className="size-3.5" />
                  <span>Add Highlight</span>
                </button>
              </div>

              {highlights.length === 0 ? (
                <p className="text-xs text-muted font-mono p-4 border border-line bg-bg/40 text-center">
                  No highlights configured yet. Click "Add Highlight" above.
                </p>
              ) : (
                <div className="space-y-2">
                  {highlights.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2.5 border border-line bg-surface"
                    >
                      <span className="font-mono text-xs text-muted w-5 text-right shrink-0">
                        {index + 1}.
                      </span>
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => handleUpdateHighlight(index, 'label', e.target.value)}
                        placeholder="Label (e.g. Experience)"
                        className="input py-1.5 text-xs flex-1"
                      />
                      <input
                        type="text"
                        value={item.value}
                        onChange={(e) => handleUpdateHighlight(index, 'value', e.target.value)}
                        placeholder="Value (e.g. 10+ Years)"
                        className="input py-1.5 text-xs flex-1"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveHighlight(index, 'up')}
                          className="p-1.5 text-muted hover:text-ink disabled:opacity-20 border border-line bg-bg transition-colors"
                          title="Move up"
                        >
                          <ChevronUp className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === highlights.length - 1}
                          onClick={() => handleMoveHighlight(index, 'down')}
                          className="p-1.5 text-muted hover:text-ink disabled:opacity-20 border border-line bg-bg transition-colors"
                          title="Move down"
                        >
                          <ChevronDown className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveHighlight(index)}
                          className="p-1.5 text-muted hover:text-rose-400 border border-line bg-bg transition-colors"
                          title="Remove highlight"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {sectionError && (
              <p className="text-xs text-rose-400 p-2.5 border border-rose-500/30 bg-rose-500/10">
                {sectionError}
              </p>
            )}

            <div className="flex justify-end pt-2 border-t border-line">
              <button
                type="submit"
                disabled={savingSection}
                className="btn-primary text-xs py-2 px-5 flex items-center gap-2"
              >
                {savingSection && <Loader2 className="size-3.5 animate-spin" />}
                <span>{savingSection ? 'Saving...' : 'Save Section Content'}</span>
              </button>
            </div>
          </form>
        )}
      </section>

      {/* SECTION 2: OVERVIEW ROWS (overview_rows table) */}
      <section className="card p-6 border-line space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="eyebrow mb-1">Key Metrics & Facts</p>
            <h2 className="text-lg font-bold text-ink">Overview Rows</h2>
            <p className="text-xs text-muted mt-0.5">
              Structured biographical facts stored in the <code className="font-mono text-accent">overview_rows</code> table.
            </p>
          </div>
          {!editingOverview && (
            <button
              type="button"
              onClick={() => {
                setEditingOverview({ label: '', value: '', visible: true })
                setOverviewFormError(null)
              }}
              className="btn-primary flex items-center gap-2 text-xs py-2 px-3.5 self-start sm:self-auto shrink-0"
            >
              <Plus className="size-4" />
              <span>Add Overview Row</span>
            </button>
          )}
        </div>

        {/* Overview Row Form */}
        {editingOverview && (
          <form
            onSubmit={handleSaveOverview}
            className="p-4 border border-line bg-bg/60 space-y-4 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between border-b border-line pb-2">
              <p className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
                {editingOverview.id ? 'Edit Overview Row' : 'New Overview Row'}
              </p>
              <button
                type="button"
                onClick={() => setEditingOverview(null)}
                className="text-muted hover:text-ink p-1"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Label"
                required
                value={editingOverview.label || ''}
                onChange={(e) => setEditingOverview({ ...editingOverview, label: e.target.value })}
                placeholder="e.g. Experience, Role, Location"
              />
              <Field
                label="Value"
                required
                value={editingOverview.value || ''}
                onChange={(e) => setEditingOverview({ ...editingOverview, value: e.target.value })}
                placeholder="e.g. 10+ Years, Staff Software Engineer"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Toggle
                label="Visible on website"
                checked={editingOverview.visible ?? true}
                onChange={(checked) => setEditingOverview({ ...editingOverview, visible: checked })}
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingOverview(null)}
                  disabled={savingOverview}
                  className="px-3 py-1.5 border border-line bg-surface text-xs font-mono uppercase tracking-wider text-muted hover:text-ink disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOverview}
                  className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5"
                >
                  {savingOverview && <Loader2 className="size-3 animate-spin" />}
                  <span>{savingOverview ? 'Saving...' : 'Save Row'}</span>
                </button>
              </div>
            </div>

            {overviewFormError && (
              <p className="text-xs text-rose-400">{overviewFormError}</p>
            )}
          </form>
        )}

        {/* Overview Rows List */}
        {loadingOverview ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="size-6 text-accent animate-spin" />
          </div>
        ) : overviewError ? (
          <p className="text-xs text-rose-400 p-4 border border-line bg-surface">{overviewError}</p>
        ) : overviewRows.length === 0 ? (
          <EmptyState
            title="No overview rows"
            description="Add overview facts such as Primary Focus, Experience, or Current Role."
            action={{
              label: 'Add First Overview Row',
              onClick: () => setEditingOverview({ label: '', value: '', visible: true }),
            }}
          />
        ) : (
          <div className="space-y-2">
            {overviewRows.map((row, index) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 p-3 border border-line bg-surface hover:border-line/80 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
                      {row.label}
                    </span>
                    {!row.visible && (
                      <span className="font-mono text-[0.65rem] uppercase px-1.5 py-0.5 bg-bg border border-line text-muted">
                        Hidden
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-ink mt-0.5 truncate">{row.value}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleOverview(row.id, 'visible')}
                    className={`px-2 py-1 font-mono text-[0.7rem] uppercase tracking-wider border transition-colors ${
                      row.visible
                        ? 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20'
                        : 'border-line bg-bg text-muted hover:text-ink'
                    }`}
                    title={row.visible ? 'Hide from portfolio' : 'Show on portfolio'}
                  >
                    {row.visible ? 'Visible' : 'Hidden'}
                  </button>

                  <div className="flex items-center border border-line bg-bg">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveOverview(row.id, 'up')}
                      className="p-1.5 text-muted hover:text-ink disabled:opacity-20 transition-colors"
                      title="Move up"
                    >
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === overviewRows.length - 1}
                      onClick={() => moveOverview(row.id, 'down')}
                      className="p-1.5 text-muted hover:text-ink disabled:opacity-20 transition-colors border-l border-line"
                      title="Move down"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingOverview({ ...row })
                      setOverviewFormError(null)
                    }}
                    className="p-1.5 border border-line bg-bg text-muted hover:text-ink transition-colors"
                    title="Edit row"
                  >
                    <Pencil className="size-3.5" />
                  </button>

                  <ConfirmButton
                    onConfirm={() => handleDeleteOverview(row.id)}
                    confirmText="Delete overview row?"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 3: CORE COMPETENCIES (competencies table) */}
      <section className="card p-6 border-line space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="eyebrow mb-1">Expertise & Skills</p>
            <h2 className="text-lg font-bold text-ink">Competencies</h2>
            <p className="text-xs text-muted mt-0.5">
              Individual capability statements stored in the <code className="font-mono text-accent">competencies</code> table.
            </p>
          </div>
          {!editingCompetency && (
            <button
              type="button"
              onClick={() => {
                setEditingCompetency({ text: '', visible: true })
                setCompetencyFormError(null)
              }}
              className="btn-primary flex items-center gap-2 text-xs py-2 px-3.5 self-start sm:self-auto shrink-0"
            >
              <Plus className="size-4" />
              <span>Add Competency</span>
            </button>
          )}
        </div>

        {/* Competency Form */}
        {editingCompetency && (
          <form
            onSubmit={handleSaveCompetency}
            className="p-4 border border-line bg-bg/60 space-y-4 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between border-b border-line pb-2">
              <p className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
                {editingCompetency.id ? 'Edit Competency' : 'New Competency'}
              </p>
              <button
                type="button"
                onClick={() => setEditingCompetency(null)}
                className="text-muted hover:text-ink p-1"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <Field
              label="Competency Statement"
              required
              value={editingCompetency.text || ''}
              onChange={(e) =>
                setEditingCompetency({ ...editingCompetency, text: e.target.value })
              }
              placeholder="e.g. Distributed Systems Architecture & Cloud Infrastructure"
            />

            <div className="flex items-center justify-between pt-2">
              <Toggle
                label="Visible on website"
                checked={editingCompetency.visible ?? true}
                onChange={(checked) =>
                  setEditingCompetency({ ...editingCompetency, visible: checked })
                }
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCompetency(null)}
                  disabled={savingCompetency}
                  className="px-3 py-1.5 border border-line bg-surface text-xs font-mono uppercase tracking-wider text-muted hover:text-ink disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCompetency}
                  className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5"
                >
                  {savingCompetency && <Loader2 className="size-3 animate-spin" />}
                  <span>{savingCompetency ? 'Saving...' : 'Save Competency'}</span>
                </button>
              </div>
            </div>

            {competencyFormError && (
              <p className="text-xs text-rose-400">{competencyFormError}</p>
            )}
          </form>
        )}

        {/* Competencies List */}
        {loadingCompetencies ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="size-6 text-accent animate-spin" />
          </div>
        ) : competenciesError ? (
          <p className="text-xs text-rose-400 p-4 border border-line bg-surface">
            {competenciesError}
          </p>
        ) : competencies.length === 0 ? (
          <EmptyState
            title="No competencies added"
            description="Add specific competency areas such as High-Performance Microservices or Cloud Security."
            action={{
              label: 'Add First Competency',
              onClick: () => setEditingCompetency({ text: '', visible: true }),
            }}
          />
        ) : (
          <div className="space-y-2">
            {competencies.map((comp, index) => (
              <div
                key={comp.id}
                className="flex items-center justify-between gap-3 p-3 border border-line bg-surface hover:border-line/80 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-1.5 border border-line bg-bg text-accent shrink-0">
                    <Info className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{comp.text}</span>
                      {!comp.visible && (
                        <span className="font-mono text-[0.65rem] uppercase px-1.5 py-0.5 bg-bg border border-line text-muted">
                          Hidden
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleCompetency(comp.id, 'visible')}
                    className={`px-2 py-1 font-mono text-[0.7rem] uppercase tracking-wider border transition-colors ${
                      comp.visible
                        ? 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20'
                        : 'border-line bg-bg text-muted hover:text-ink'
                    }`}
                    title={comp.visible ? 'Hide from portfolio' : 'Show on portfolio'}
                  >
                    {comp.visible ? 'Visible' : 'Hidden'}
                  </button>

                  <div className="flex items-center border border-line bg-bg">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveCompetency(comp.id, 'up')}
                      className="p-1.5 text-muted hover:text-ink disabled:opacity-20 transition-colors"
                      title="Move up"
                    >
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === competencies.length - 1}
                      onClick={() => moveCompetency(comp.id, 'down')}
                      className="p-1.5 text-muted hover:text-ink disabled:opacity-20 transition-colors border-l border-line"
                      title="Move down"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingCompetency({ ...comp })
                      setCompetencyFormError(null)
                    }}
                    className="p-1.5 border border-line bg-bg text-muted hover:text-ink transition-colors"
                    title="Edit competency"
                  >
                    <Pencil className="size-3.5" />
                  </button>

                  <ConfirmButton
                    onConfirm={() => handleDeleteCompetency(comp.id)}
                    confirmText="Delete competency?"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
