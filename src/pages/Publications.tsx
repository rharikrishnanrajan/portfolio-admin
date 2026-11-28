import { useState, useRef } from 'react'
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  Plus,
  X,
} from 'lucide-react'
import { useCrud } from '../lib/useCrud'
import { supabase } from '../lib/supabase'
import { friendlyErrorMessage } from '../lib/errors'
import { extractStoragePath, removeFile } from '../lib/storage'
import { formatDateDisplay } from '../lib/date'
import { isValidUrl } from '../lib/validation'
import { safeUrl } from '../lib/safeUrl'
import {
  PageHeader,
  Field,
  TextArea,
  Toggle,
  FileUpload,
  ConfirmButton,
  EmptyState,
  useToast,
} from '../components/ui'
import type { PublicationRow, ProjectFile } from '../types/rows'

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
  const [pubUrl, setPubUrl] = useState<string>('')
  const [savingItem, setSavingItem] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const formErrorRef = useRef<HTMLParagraphElement>(null)

  // Clean up PDF file from portfolio bucket
  const deleteStoragePdf = async (url: string | null | undefined) => {
    if (!url) return
    const path = extractStoragePath('portfolio', url)
    if (path) {
      try {
        await removeFile('portfolio', path)
      } catch (err) {
        console.warn('Could not remove publication PDF from storage:', err)
      }
    }
  }

  const handleNew = () => {
    setEditingItem({
      title: '',
      venue: '',
      published_on: null,
      summary: '',
      reference: '',
      url: null,
      visible: true,
    })
    setPubUrl('')
    setFormError(null)
  }

  const handleEdit = (item: PublicationRow) => {
    setEditingItem({
      ...item,
      venue: item.venue || '',
      summary: item.summary || '',
      reference: item.reference || '',
      url: item.url || null,
      published_on: item.published_on || null,
      visible: item.visible ?? true,
    })
    setPubUrl(item.url || '')
    setFormError(null)
  }

  const handleCancel = () => {
    setEditingItem(null)
    setPubUrl('')
    setFormError(null)
  }

  // Handle uploaded publication PDF
  const handlePdfUploaded = async (file: ProjectFile) => {
    const oldUrl = pubUrl

    if (editingItem?.id) {
      try {
        let updateQuery = supabase
          .from('publications')
          .update({ url: file.url })
          .eq('id', editingItem.id)

        if (editingItem.updated_at) {
          updateQuery = updateQuery.eq('updated_at', editingItem.updated_at)
        }

        const { data, error } = await updateQuery.select()
        if (error) throw error
        if (!data || data.length === 0) {
          throw new Error('Failed to update publication row.')
        }

        const updatedRow = data[0] as PublicationRow
        setEditingItem(updatedRow)
        setPubUrl(file.url)

        if (oldUrl && oldUrl !== file.url && extractStoragePath('portfolio', oldUrl)) {
          await deleteStoragePdf(oldUrl)
        }

        toast.success('Publication PDF uploaded and saved.')
      } catch (err) {
        await deleteStoragePdf(file.url)
        const msg = friendlyErrorMessage(err)
        toast.error(`Failed to update publication PDF: ${msg}`)
        throw err
      }
    } else {
      setPubUrl(file.url)
      toast.success('Publication PDF uploaded.')
    }
  }

  // Handle remove publication PDF (deleting only after row is saved with URL cleared)
  const handleRemovePdf = async () => {
    const oldUrl = pubUrl
    if (!oldUrl) return

    if (editingItem?.id) {
      try {
        let updateQuery = supabase
          .from('publications')
          .update({ url: null })
          .eq('id', editingItem.id)

        if (editingItem.updated_at) {
          updateQuery = updateQuery.eq('updated_at', editingItem.updated_at)
        }

        const { data, error } = await updateQuery.select()
        if (error) throw error
        if (!data || data.length === 0) {
          throw new Error('Failed to update publication row.')
        }

        const updatedRow = data[0] as PublicationRow
        setEditingItem(updatedRow)
        setPubUrl('')

        if (extractStoragePath('portfolio', oldUrl)) {
          await deleteStoragePdf(oldUrl)
        }

        toast.info('Publication PDF removed.')
      } catch (err) {
        const msg = friendlyErrorMessage(err)
        toast.error(`Failed to remove publication PDF: ${msg}`)
      }
    } else {
      if (extractStoragePath('portfolio', oldUrl)) {
        await deleteStoragePdf(oldUrl)
      }
      setPubUrl('')
      toast.info('Publication PDF removed.')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    setFormError(null)
    if (!editingItem.title?.trim()) {
      const msg = 'Publication title is required.'
      setFormError(msg)
      toast.error(msg)
      formErrorRef.current?.scrollIntoView({ block: 'center' })
      setTimeout(() => formErrorRef.current?.scrollIntoView({ block: 'center' }), 0)
      return
    }

    const trimmedUrl = pubUrl.trim()
    if (trimmedUrl && !isValidUrl(trimmedUrl)) {
      const msg = 'Publication URL must start with http:// or https://'
      setFormError(msg)
      toast.error(msg)
      formErrorRef.current?.scrollIntoView({ block: 'center' })
      setTimeout(() => formErrorRef.current?.scrollIntoView({ block: 'center' }), 0)
      return
    }

    setSavingItem(true)
    const oldStorageUrl = editingItem.url
    const finalPubUrl = trimmedUrl || null

    try {
      const savedRow = await save({
        ...editingItem,
        title: editingItem.title.trim(),
        venue: editingItem.venue?.trim() || null,
        published_on: editingItem.published_on || null,
        summary: editingItem.summary?.trim() || null,
        reference: editingItem.reference?.trim() || null,
        url: finalPubUrl,
        visible: editingItem.visible ?? true,
      })

      if (!savedRow) {
        throw new Error('No row was updated. Check the id and your login.')
      }

      if (
        oldStorageUrl &&
        oldStorageUrl !== finalPubUrl &&
        extractStoragePath('portfolio', oldStorageUrl)
      ) {
        await deleteStoragePdf(oldStorageUrl)
      }

      toast.success(editingItem.id ? 'Publication updated.' : 'Publication created.')
      setEditingItem(null)
      setPubUrl('')
    } catch (err) {
      if (!editingItem.id && finalPubUrl && extractStoragePath('portfolio', finalPubUrl)) {
        await deleteStoragePdf(finalPubUrl)
      }
      const msg = friendlyErrorMessage(err)
      setFormError(msg)
      toast.error(msg)
      formErrorRef.current?.scrollIntoView({ block: 'center' })
      setTimeout(() => formErrorRef.current?.scrollIntoView({ block: 'center' }), 0)
    } finally {
      setSavingItem(false)
    }
  }

  const handleDelete = async (pub: PublicationRow) => {
    try {
      await remove(pub.id)
      if (pub.url) {
        await deleteStoragePdf(pub.url)
      }
      toast.success('Publication deleted.')
    } catch (err) {
      const msg = friendlyErrorMessage(err)
      toast.error(`Failed to delete: ${msg}`)
    }
  }

  const handleToggleVisible = async (id: string) => {
    try {
      await toggle(id, 'visible')
    } catch (err) {
      const msg = friendlyErrorMessage(err)
      toast.error(msg)
    }
  }

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    try {
      await move(id, direction)
    } catch (err) {
      const msg = friendlyErrorMessage(err)
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
              className="scheme-dark"
            />
          </div>

          <Field
            label="Citation / Reference / DOI"
            value={editingItem.reference || ''}
            onChange={(e) => setEditingItem({ ...editingItem, reference: e.target.value })}
            placeholder="e.g. DOI: 10.1145/..., Vol. 42, pp. 110-125"
          />

          {/* Publication URL & Document Upload */}
          <div className="space-y-4 pt-2 border-t border-line">
            <Field
              label="Publication URL"
              value={pubUrl}
              onChange={(e) => setPubUrl(e.target.value)}
              placeholder="https://doi.org/... or upload a PDF below"
              hint="External DOI/paper link, or auto-filled when uploading a publication PDF. Empty box saves null."
            />

            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-muted mb-1.5">
                Publication Document (PDF)
              </p>
              {pubUrl && extractStoragePath('portfolio', pubUrl) ? (
                <div className="border border-line bg-surface p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 border border-line bg-bg text-accent shrink-0">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">Attached Storage Document</p>
                      <p className="text-xs text-muted truncate font-mono">
                        {pubUrl}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {safeUrl(pubUrl) ? (
                      <a
                        href={safeUrl(pubUrl)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 border border-line bg-bg text-muted hover:text-ink transition-colors"
                        title="View PDF"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleRemovePdf}
                      className="p-1.5 border border-line bg-bg text-muted hover:text-rose-400 transition-colors"
                      title="Remove PDF from storage"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <FileUpload
                  bucket="portfolio"
                  folder="publications"
                  accept=".pdf,application/pdf"
                  icon={<FileText className="size-4 text-accent" />}
                  buttonText="Upload Publication Document"
                  fileHint="(PDF up to 10 MB)"
                  onUploaded={handlePdfUploaded}
                  hint="Upload publication PDF to the portfolio bucket (auto-populates Publication URL above)"
                />
              )}
            </div>
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
            <p
              ref={formErrorRef}
              className="text-xs text-rose-400 p-2.5 border border-rose-500/30 bg-rose-500/10"
            >
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

                    {safeUrl(item.url) ? (
                      <div className="mt-2">
                        <a
                          href={safeUrl(item.url)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-mono text-accent hover:underline"
                        >
                          <span>View Publication</span>
                          <ExternalLink className="size-3" />
                        </a>
                      </div>
                    ) : null}
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
                    onConfirm={() => handleDelete(item)}
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
