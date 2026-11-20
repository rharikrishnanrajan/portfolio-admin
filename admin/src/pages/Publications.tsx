import { useState } from 'react'
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  X,
} from 'lucide-react'
import { useCrud } from '../lib/useCrud'
import { formatDateDisplay } from '../lib/date'
import { isValidUrl } from '../lib/validation'
import {
  PageHeader,
  Field,
  TextArea,
  Toggle,
  ConfirmButton,
  EmptyState,
  useToast,
} from '../components/ui'
import type { PublicationRow } from '../types/rows'

export default function Publications() {
  const { toast } = useToast()
  const {
    rows: publications,
    loading,
    error,
    save,
    remove,
    move,
    toggle,
  } = useCrud<PublicationRow>('publications', { orderBy: 'position', ascending: true })

  // Add / Edit form state
  const [editingItem, setEditingItem] = useState<Partial<PublicationRow> | null>(null)
  const [savingItem, setSavingItem] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleNew = () => {
    setEditingItem({
      title: '',
      venue: '',
      published_on: null,
      summary: '',
      reference: '',
      url: '',
      visible: true,
    })
    setFormError(null)
  }

  const handleEdit = (item: PublicationRow) => {
    setEditingItem({
      ...item,
      venue: item.venue || '',
      summary: item.summary || '',
      reference: item.reference || '',
      url: item.url || '',
      published_on: item.published_on || null,
      visible: item.visible ?? true,
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
      setFormError('Publication title is required.')
      return
    }
    if (editingItem.url && !isValidUrl(editingItem.url)) {
      setFormError('Publication URL must start with http:// or https://')
      return
    }

    setSavingItem(true)
    try {
      await save({
        ...editingItem,
        title: editingItem.title.trim(),
        venue: editingItem.venue?.trim() || null,
        published_on: editingItem.published_on || null,
        summary: editingItem.summary?.trim() || null,
        reference: editingItem.reference?.trim() || null,
        url: editingItem.url?.trim() || null,
        visible: editingItem.visible ?? true,
      })

      toast.success(editingItem.id ? 'Publication updated.' : 'Publication created.')
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
      toast.success('Publication deleted.')
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

  const visibleCount = publications.filter((p) => p.visible).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          eyebrow="Academic & Industry Research"
          title="Publications"
          description="Manage your published scientific papers, conference proceedings, journal articles, and whitepapers."
        />
        {!editingItem && (
          <button
            type="button"
            onClick={handleNew}
            className="btn-primary flex items-center gap-2 text-xs py-2 px-3.5 self-start sm:self-auto shrink-0"
          >
            <Plus className="size-4" />
            <span>Add Publication</span>
          </button>
        )}
      </div>

      {/* Summary stats pill bar */}
      {!loading && !error && publications.length > 0 && (
        <div className="flex items-center gap-4 text-xs font-mono text-muted border-b border-line pb-3">
          <span>
            Total: <strong className="text-ink">{publications.length}</strong>
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
              <p className="eyebrow mb-0.5">Publication Editor</p>
              <h2 className="text-base font-bold text-ink">
                {editingItem.id ? 'Edit Publication' : 'New Publication'}
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

          <Field
            label="Publication Title"
            required
            value={editingItem.title || ''}
            onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
            placeholder="e.g. Scalable Stream Processing on Edge Micro-Clusters"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Venue / Conference / Journal"
              value={editingItem.venue || ''}
              onChange={(e) => setEditingItem({ ...editingItem, venue: e.target.value })}
              placeholder="e.g. IEEE Transactions on Cloud Computing, ACM SIGMOD"
            />
            <Field
              type="date"
              label="Publication Date"
              value={editingItem.published_on || ''}
              onChange={(e) => setEditingItem({ ...editingItem, published_on: e.target.value })}
              className="[color-scheme:dark]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Citation / Reference / DOI"
              value={editingItem.reference || ''}
              onChange={(e) => setEditingItem({ ...editingItem, reference: e.target.value })}
              placeholder="e.g. DOI: 10.1145/..., Vol. 42, pp. 110-125"
            />
            <Field
              label="Publication URL"
              value={editingItem.url || ''}
              onChange={(e) => setEditingItem({ ...editingItem, url: e.target.value })}
              placeholder="https://doi.org/... or https://arxiv.org/..."
              hint="Must start with http:// or https://"
            />
          </div>

          <TextArea
            label="Abstract / Summary"
            value={editingItem.summary || ''}
            onChange={(e) => setEditingItem({ ...editingItem, summary: e.target.value })}
            rows={4}
            placeholder="Brief overview of research hypotheses, methodology, architectural novelties, and findings..."
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-line">
            <Toggle
              label="Visible on website"
              description="Display this publication on your public publications list"
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
                <span>{savingItem ? 'Saving...' : editingItem.id ? 'Save Changes' : 'Create Publication'}</span>
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

      {/* Publications List */}
      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="size-8 text-accent animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm">
          <p className="font-semibold mb-1">Failed to load publications</p>
          <p className="text-xs">{error}</p>
        </div>
      ) : publications.length === 0 ? (
        <EmptyState
          title="No publications yet"
          description="Add your papers, articles, preprints, or research contributions."
          action={{
            label: 'Add First Publication',
            onClick: handleNew,
          }}
        />
      ) : (
        <div className="space-y-3">
          {publications.map((item, index) => {
            const dateStr = formatDateDisplay(item.published_on)

            return (
              <div
                key={item.id}
                className="card p-4 border-line flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-line/80 transition-colors"
              >
                {/* Left icon + details */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="p-3 border border-line bg-bg text-accent shrink-0">
                    <BookOpen className="size-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-base font-bold text-ink">{item.title}</span>
                      {!item.visible && (
                        <span className="font-mono text-[0.65rem] uppercase px-1.5 py-0.5 bg-bg border border-line text-muted">
                          Hidden
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted mt-0.5">
                      {item.venue && <span className="text-ink font-medium">{item.venue}</span>}
                      {item.venue && dateStr && <span>•</span>}
                      {dateStr && <span className="font-mono">{dateStr}</span>}
                      {item.reference && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[0.65rem] px-1.5 py-0.5 bg-bg border border-line text-accent">
                            {item.reference}
                          </span>
                        </>
                      )}
                    </div>

                    {item.summary && (
                      <p className="text-xs text-muted mt-1.5 line-clamp-2 max-w-3xl">
                        {item.summary}
                      </p>
                    )}

                    {item.url && (
                      <div className="mt-2">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-mono text-accent hover:underline"
                        >
                          <span>View Publication</span>
                          <ExternalLink className="size-3" />
                        </a>
                      </div>
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
                      disabled={index === publications.length - 1}
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
                    title="Edit publication"
                  >
                    <Pencil className="size-3.5" />
                  </button>

                  {/* Delete button with confirm */}
                  <ConfirmButton
                    onConfirm={() => handleDelete(item.id)}
                    confirmText="Delete publication?"
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
