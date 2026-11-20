import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  X,
} from 'lucide-react'
import { useCrud } from '../lib/useCrud'
import {
  PageHeader,
  Field,
  TextArea,
  Toggle,
  ConfirmButton,
  EmptyState,
  useToast,
} from '../components/ui'
import type { EducationRow } from '../types/rows'

export default function Education() {
  const { toast } = useToast()
  const {
    rows: educationList,
    loading,
    error,
    save,
    remove,
    move,
    toggle,
  } = useCrud<EducationRow>('education', { orderBy: 'position', ascending: true })

  // Add / Edit form state
  const [editingItem, setEditingItem] = useState<Partial<EducationRow> | null>(null)
  const [savingItem, setSavingItem] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleNew = () => {
    setEditingItem({
      degree: '',
      institution: '',
      score_label: 'GPA',
      score: '',
      note: '',
      visible: true,
    })
    setFormError(null)
  }

  const handleEdit = (item: EducationRow) => {
    setEditingItem({
      ...item,
      score_label: item.score_label || 'GPA',
      score: item.score || '',
      note: item.note || '',
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
    if (!editingItem.degree?.trim()) {
      setFormError('Degree / Qualification is required.')
      return
    }
    if (!editingItem.institution?.trim()) {
      setFormError('Institution is required.')
      return
    }

    setSavingItem(true)
    try {
      await save({
        ...editingItem,
        degree: editingItem.degree.trim(),
        institution: editingItem.institution.trim(),
        score_label: editingItem.score_label?.trim() || 'GPA',
        score: editingItem.score?.trim() || null,
        note: editingItem.note?.trim() || null,
        visible: editingItem.visible ?? true,
      })

      toast.success(editingItem.id ? 'Education entry updated.' : 'Education entry created.')
      setEditingItem(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setFormError(msg)
    } finally {
      setSavingItem(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await remove(id)
      toast.success('Education entry deleted.')
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

  const visibleCount = educationList.filter((e) => e.visible).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          eyebrow="Academic Background"
          title="Education"
          description="Manage your university degrees, diplomas, institutions, academic scores, and honors."
        />
        {!editingItem && (
          <button
            type="button"
            onClick={handleNew}
            className="btn-primary flex items-center gap-2 text-xs py-2 px-3.5 self-start sm:self-auto shrink-0"
          >
            <Plus className="size-4" />
            <span>Add Education</span>
          </button>
        )}
      </div>

      {/* Summary stats pill bar */}
      {!loading && !error && educationList.length > 0 && (
        <div className="flex items-center gap-4 text-xs font-mono text-muted border-b border-line pb-3">
          <span>
            Total Entries: <strong className="text-ink">{educationList.length}</strong>
          </span>
          <span>•</span>
          <span>
            Visible: <strong className="text-accent">{visibleCount}</strong>
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
              <p className="eyebrow mb-0.5">Education Record</p>
              <h2 className="text-base font-bold text-ink">
                {editingItem.id ? 'Edit Education Entry' : 'New Education Entry'}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Degree / Qualification"
              required
              value={editingItem.degree || ''}
              onChange={(e) => setEditingItem({ ...editingItem, degree: e.target.value })}
              placeholder="e.g. B.S. in Computer Science & Engineering"
            />
            <Field
              label="Institution / University"
              required
              value={editingItem.institution || ''}
              onChange={(e) => setEditingItem({ ...editingItem, institution: e.target.value })}
              placeholder="e.g. Stanford University or MIT"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Score Label"
              value={editingItem.score_label || ''}
              onChange={(e) => setEditingItem({ ...editingItem, score_label: e.target.value })}
              placeholder="e.g. GPA, CGPA, Percentage, Honors"
              hint="Label displayed next to the score"
            />
            <Field
              label="Score / Result"
              value={editingItem.score || ''}
              onChange={(e) => setEditingItem({ ...editingItem, score: e.target.value })}
              placeholder="e.g. 3.9 / 4.0 or First Class with Distinction"
            />
          </div>

          <TextArea
            label="Notes / Specialization / Highlights"
            value={editingItem.note || ''}
            onChange={(e) => setEditingItem({ ...editingItem, note: e.target.value })}
            rows={3}
            placeholder="Specialization in Distributed Systems, Dean's Honor Roll, published undergraduate thesis..."
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-line">
            <Toggle
              label="Visible on website"
              description="Display this education entry on your public portfolio"
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
                <span>{savingItem ? 'Saving...' : editingItem.id ? 'Save Changes' : 'Create Entry'}</span>
              </button>
            </div>
          </div>

          {formError && (
            <p className="text-xs text-rose-400 p-2.5 border border-rose-500/30 bg-rose-500/10">
              {formError}
            </p>
          )}
        </form>
      )}

      {/* Education List */}
      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="size-8 text-accent animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm">
          <p className="font-semibold mb-1">Failed to load education</p>
          <p className="text-xs">{error}</p>
        </div>
      ) : educationList.length === 0 ? (
        <EmptyState
          title="No education entries yet"
          description="Add your educational qualifications, degrees, and academic honors."
          action={{
            label: 'Add First Education',
            onClick: handleNew,
          }}
        />
      ) : (
        <div className="space-y-3">
          {educationList.map((item, index) => (
            <div
              key={item.id}
              className="card p-4 border-line flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-line/80 transition-colors"
            >
              {/* Left icon + details */}
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className="p-3 border border-line bg-bg text-accent shrink-0">
                  <GraduationCap className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-base font-bold text-ink">{item.degree}</span>
                    {!item.visible && (
                      <span className="font-mono text-[0.65rem] uppercase px-1.5 py-0.5 bg-bg border border-line text-muted">
                        Hidden
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-ink/90 font-medium">{item.institution}</p>

                  {item.score && (
                    <p className="font-mono text-xs text-accent mt-1">
                      {item.score_label || 'Score'}: <span className="text-ink">{item.score}</span>
                    </p>
                  )}

                  {item.note && (
                    <p className="text-xs text-muted mt-1.5 line-clamp-2 max-w-2xl">{item.note}</p>
                  )}
                </div>
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-line w-full md:w-auto justify-end">
                {/* Visible Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleVisible(item.id)}
                  className={`px-2 py-1 font-mono text-[0.7rem] uppercase tracking-wider border transition-colors ${
                    item.visible
                      ? 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20'
                      : 'border-line bg-bg text-muted hover:text-ink'
                  }`}
                  title={item.visible ? 'Hide from portfolio' : 'Show on portfolio'}
                >
                  {item.visible ? 'Visible' : 'Hidden'}
                </button>

                {/* Reorder Up/Down */}
                <div className="flex items-center border border-line bg-bg">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMove(item.id, 'up')}
                    className="p-1.5 text-muted hover:text-ink disabled:opacity-20 transition-colors"
                    title="Move up"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === educationList.length - 1}
                    onClick={() => handleMove(item.id, 'down')}
                    className="p-1.5 text-muted hover:text-ink disabled:opacity-20 transition-colors border-l border-line"
                    title="Move down"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                </div>

                {/* Edit button */}
                <button
                  type="button"
                  onClick={() => handleEdit(item)}
                  className="p-1.5 border border-line bg-bg text-muted hover:text-ink transition-colors"
                  title="Edit entry"
                >
                  <Pencil className="size-3.5" />
                </button>

                {/* Delete button with confirm */}
                <ConfirmButton
                  onConfirm={() => handleDelete(item.id)}
                  confirmText="Delete education entry?"
                  confirmButtonText="Yes, delete"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
