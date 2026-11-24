import { useState, useRef } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Plus,
  Wrench,
  X,
} from 'lucide-react'
import { useCrud } from '../lib/useCrud'
import {
  PageHeader,
  Field,
  Toggle,
  TagInput,
  ConfirmButton,
  EmptyState,
  useToast,
} from '../components/ui'
import type { SkillDomainRow } from '../types/rows'

export default function Skills() {
  const { toast } = useToast()
  const {
    rows: skills,
    loading,
    error,
    save,
    remove,
    move,
    toggle,
  } = useCrud<SkillDomainRow>('skill_domains', { orderBy: 'position', ascending: true })

  // Add / Edit form state
  const [editingItem, setEditingItem] = useState<Partial<SkillDomainRow> | null>(null)
  const [savingItem, setSavingItem] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const formErrorRef = useRef<HTMLParagraphElement>(null)

  const handleNew = () => {
    setEditingItem({
      title: '',
      tools: [],
      status: 'Active',
      visible: true,
    })
    setFormError(null)
  }

  const handleEdit = (item: SkillDomainRow) => {
    setEditingItem({
      ...item,
      tools: Array.isArray(item.tools) ? [...item.tools] : [],
      status: item.status || '',
    })
    setFormError(null)
  }

  const handleCancel = () => {
    setEditingItem(null)
    setFormError(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    setFormError(null)
    if (!editingItem.title?.trim()) {
      const msg = 'Domain title is required.'
      setFormError(msg)
      toast.error(msg)
      formErrorRef.current?.scrollIntoView({ block: 'center' })
      setTimeout(() => formErrorRef.current?.scrollIntoView({ block: 'center' }), 0)
      return
    }

    setSavingItem(true)
    try {
      const cleanTools = (editingItem.tools || []).map((t) => t.trim()).filter(Boolean)

      await save({
        ...editingItem,
        title: editingItem.title.trim(),
        tools: cleanTools,
        status: editingItem.status?.trim() || 'Active',
        visible: editingItem.visible ?? true,
      })

      toast.success(editingItem.id ? 'Skill domain updated.' : 'Skill domain created.')
      setEditingItem(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setFormError(msg)
      toast.error(msg)
      formErrorRef.current?.scrollIntoView({ block: 'center' })
      setTimeout(() => formErrorRef.current?.scrollIntoView({ block: 'center' }), 0)
    } finally {
      setSavingItem(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await remove(id)
      toast.success('Skill domain deleted.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Failed to delete: ${msg}`)
    }
  }

  const handleToggleVisible = async (id: string) => {
    try {
      await toggle(id, 'visible')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg)
    }
  }

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    try {
      await move(id, direction)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg)
    }
  }

  const visibleCount = skills.filter((s) => s.visible).length
  const totalToolsCount = skills.reduce(
    (acc, curr) => acc + (Array.isArray(curr.tools) ? curr.tools.length : 0),
    0
  )

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          eyebrow="Expertise"
          title="Skills"
          description="Group your technical competencies into domains with technologies and proficiency levels."
        />
        {!editingItem && (
          <button
            type="button"
            onClick={handleNew}
            className="btn-primary flex items-center gap-2 text-xs py-2 px-3.5 self-start sm:self-auto shrink-0"
          >
            <Plus className="size-4" />
            <span>Add Skill Domain</span>
          </button>
        )}
      </div>

      {/* Summary stats pill bar */}
      {!loading && !error && skills.length > 0 && (
        <div className="flex items-center gap-4 text-xs font-mono text-muted border-b border-line pb-3">
          <span>
            Domains: <strong className="text-ink">{skills.length}</strong>
          </span>
          <span>•</span>
          <span>
            Visible: <strong className="text-accent">{visibleCount}</strong>
          </span>
          <span>•</span>
          <span>
            Total Tools: <strong className="text-ink">{totalToolsCount}</strong>
          </span>
        </div>
      )}

      {/* Add / Edit Form Card */}
      {editingItem && (
        <form
          onSubmit={handleSave}
          className="card p-6 border-line space-y-5 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <p className="eyebrow mb-0.5">Skill Domain Editor</p>
              <h2 className="text-base font-bold text-ink">
                {editingItem.id ? 'Edit Skill Domain' : 'New Skill Domain'}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="text-muted hover:text-ink p-1 transition-colors"
              aria-label="Close form"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Field
                label="Domain Title"
                required
                value={editingItem.title || ''}
                onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                placeholder="e.g. Languages & Frameworks, Cloud & DevOps, Databases"
              />
            </div>
            <div className="md:col-span-1">
              <Field
                label="Status / Level"
                value={editingItem.status || ''}
                onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value })}
                placeholder="e.g. Primary, Advanced, Exploring"
                hint="Badge label on the domain card"
              />
            </div>
          </div>

          <div>
            <TagInput
              label="Technologies & Tools"
              value={editingItem.tools || []}
              onChange={(tools) => setEditingItem({ ...editingItem, tools })}
              placeholder="Type technology and press Enter (e.g. TypeScript, React, Docker)..."
              hint="Press Enter or comma to add each tool chip."
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-line">
            <Toggle
              label="Visible on website"
              description="Display this domain group on your public skills section"
              checked={editingItem.visible ?? true}
              onChange={(checked) => setEditingItem({ ...editingItem, visible: checked })}
            />

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleCancel}
                disabled={savingItem}
                className="px-4 py-2 border border-line bg-surface text-xs font-mono uppercase tracking-wider text-muted hover:text-ink transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingItem}
                className="btn-primary text-xs py-2 px-5 flex items-center gap-2"
              >
                {savingItem && <Loader2 className="size-3.5 animate-spin" />}
                <span>{savingItem ? 'Saving...' : editingItem.id ? 'Save Changes' : 'Create Domain'}</span>
              </button>
            </div>
          </div>

          {formError && (
            <p
              ref={formErrorRef}
              className="text-xs text-rose-400 p-2.5 border border-rose-500/30 bg-rose-500/10"
            >
              {formError}
            </p>
          )}
        </form>
      )}

      {/* Skill Domains List */}
      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="size-8 text-accent animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm">
          <p className="font-semibold mb-1">Failed to load skills</p>
          <p className="text-xs">{error}</p>
        </div>
      ) : skills.length === 0 ? (
        <EmptyState
          title="No skill domains configured"
          description="Create your first skill group such as Frontend, Backend, or Cloud Engineering."
          action={{
            label: 'Add First Domain',
            onClick: handleNew,
          }}
        />
      ) : (
        <div className="space-y-3">
          {skills.map((domain, index) => {
            const toolList = Array.isArray(domain.tools) ? domain.tools : []

            return (
              <div
                key={domain.id}
                className="card p-4 border-line flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-line/80 transition-colors"
              >
                {/* Domain icon, text & tools chips */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="p-3 border border-line bg-bg text-accent shrink-0">
                    <Wrench className="size-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-base font-bold text-ink">{domain.title}</span>
                      {domain.status && (
                        <span className="font-mono text-[0.65rem] uppercase px-1.5 py-0.5 border border-accent/40 bg-accent/10 text-accent">
                          {domain.status}
                        </span>
                      )}
                      {!domain.visible && (
                        <span className="font-mono text-[0.65rem] uppercase px-1.5 py-0.5 bg-bg border border-line text-muted">
                          Hidden
                        </span>
                      )}
                      <span className="font-mono text-[0.65rem] text-muted">
                        ({toolList.length} {toolList.length === 1 ? 'tool' : 'tools'})
                      </span>
                    </div>

                    {toolList.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        {toolList.map((tool) => (
                          <span
                            key={tool}
                            className="font-mono text-xs px-2 py-0.5 bg-bg border border-line text-ink"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted font-mono mt-1">No tools added yet</p>
                    )}
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-line w-full md:w-auto justify-end">
                  {/* Visible Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleVisible(domain.id)}
                    className={`px-2 py-1 font-mono text-[0.7rem] uppercase tracking-wider border transition-colors ${
                      domain.visible
                        ? 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20'
                        : 'border-line bg-bg text-muted hover:text-ink'
                    }`}
                    title={domain.visible ? 'Hide from portfolio' : 'Show on portfolio'}
                  >
                    {domain.visible ? 'Visible' : 'Hidden'}
                  </button>

                  {/* Reorder Up/Down */}
                  <div className="flex items-center border border-line bg-bg">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(domain.id, 'up')}
                      className="p-1.5 text-muted hover:text-ink disabled:opacity-20 transition-colors"
                      title="Move up"
                    >
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === skills.length - 1}
                      onClick={() => handleMove(domain.id, 'down')}
                      className="p-1.5 text-muted hover:text-ink disabled:opacity-20 transition-colors border-l border-line"
                      title="Move down"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>

                  {/* Edit button */}
                  <button
                    type="button"
                    onClick={() => handleEdit(domain)}
                    className="p-1.5 border border-line bg-bg text-muted hover:text-ink transition-colors"
                    title="Edit domain"
                  >
                    <Pencil className="size-3.5" />
                  </button>

                  {/* Delete button with confirm */}
                  <ConfirmButton
                    onConfirm={() => handleDelete(domain.id)}
                    confirmText="Delete skill domain?"
                    confirmButtonText="Yes, delete"
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
