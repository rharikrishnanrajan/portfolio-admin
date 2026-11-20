import { useState } from 'react'
import {
  Award,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Star,
  X,
} from 'lucide-react'
import { useCrud } from '../lib/useCrud'
import { extractStoragePath, removeFile } from '../lib/storage'
import { monthToDbDate, dbDateToMonth, formatMonthDisplay } from '../lib/date'
import { isValidUrl } from '../lib/validation'
import {
  PageHeader,
  Field,
  Toggle,
  FileUpload,
  ConfirmButton,
  EmptyState,
  useToast,
} from '../components/ui'
import type { CertificationRow, ProjectFile } from '../types/rows'

export default function Certifications() {
  const { toast } = useToast()
  const {
    rows: certifications,
    loading,
    error,
    save,
    remove,
    move,
    toggle,
  } = useCrud<CertificationRow>('certifications', { orderBy: 'position', ascending: true })

  // Add / Edit form state
  const [editingItem, setEditingItem] = useState<Partial<CertificationRow> | null>(null)
  const [startMonth, setStartMonth] = useState<string>('')
  const [endMonth, setEndMonth] = useState<string>('')
  const [savingItem, setSavingItem] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Clean up PDF file from portfolio bucket
  const deleteStoragePdf = async (url: string | null | undefined) => {
    if (!url) return
    const path = extractStoragePath('portfolio', url)
    if (path) {
      try {
        await removeFile('portfolio', path)
      } catch (err) {
        console.warn('Could not remove certification PDF from storage:', err)
      }
    }
  }

  const handleNew = () => {
    setEditingItem({
      title: '',
      issuer: '',
      start_date: null,
      end_date: null,
      credential_url: null,
      featured: false,
      visible: true,
    })
    setStartMonth('')
    setEndMonth('')
    setFormError(null)
  }

  const handleEdit = (item: CertificationRow) => {
    setEditingItem({
      ...item,
      credential_url: item.credential_url || null,
      featured: item.featured ?? false,
      visible: item.visible ?? true,
    })
    setStartMonth(dbDateToMonth(item.start_date))
    setEndMonth(dbDateToMonth(item.end_date))
    setFormError(null)
  }

  const handleCancel = () => {
    setEditingItem(null)
    setStartMonth('')
    setEndMonth('')
    setFormError(null)
  }

  // Handle uploaded credential PDF
  const handlePdfUploaded = async (file: ProjectFile) => {
    if (!editingItem) return

    // If an old credential PDF was present, delete it from storage
    if (editingItem.credential_url && editingItem.credential_url !== file.url) {
      await deleteStoragePdf(editingItem.credential_url)
    }

    setEditingItem({
      ...editingItem,
      credential_url: file.url,
    })
    toast.success('Credential PDF uploaded.')
  }

  // Handle remove credential PDF
  const handleRemovePdf = async () => {
    if (!editingItem?.credential_url) return

    await deleteStoragePdf(editingItem.credential_url)
    setEditingItem({
      ...editingItem,
      credential_url: null,
    })
    toast.info('Credential PDF removed from storage.')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    setFormError(null)
    if (!editingItem.title?.trim()) {
      setFormError('Certification title is required.')
      return
    }
    if (!editingItem.issuer?.trim()) {
      setFormError('Issuer organization is required.')
      return
    }
    if (editingItem.credential_url && !isValidUrl(editingItem.credential_url)) {
      setFormError('Credential URL must start with http:// or https://')
      return
    }
    if (startMonth && endMonth && endMonth < startMonth) {
      setFormError('Expiration date cannot be earlier than issue date.')
      return
    }

    setSavingItem(true)
    try {
      const dbStartDate = monthToDbDate(startMonth)
      const dbEndDate = monthToDbDate(endMonth)

      await save({
        ...editingItem,
        title: editingItem.title.trim(),
        issuer: editingItem.issuer.trim(),
        start_date: dbStartDate,
        end_date: dbEndDate,
        credential_url: editingItem.credential_url?.trim() || null,
        featured: editingItem.featured ?? false,
        visible: editingItem.visible ?? true,
      })

      toast.success(editingItem.id ? 'Certification updated.' : 'Certification created.')
      setEditingItem(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setFormError(msg)
    } finally {
      setSavingItem(false)
    }
  }

  const handleDelete = async (cert: CertificationRow) => {
    try {
      // Clean up storage PDF if attached
      if (cert.credential_url) {
        await deleteStoragePdf(cert.credential_url)
      }
      await remove(cert.id)
      toast.success('Certification deleted.')
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

  const handleToggleFeatured = async (id: string) => {
    try {
      await toggle(id, 'featured')
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

  const visibleCount = certifications.filter((c) => c.visible).length
  const featuredCount = certifications.filter((c) => c.featured).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          eyebrow="Credentials"
          title="Certifications"
          description="Manage your professional licenses, certifications, validation dates, and credential documents."
        />
        {!editingItem && (
          <button
            type="button"
            onClick={handleNew}
            className="btn-primary flex items-center gap-2 text-xs py-2 px-3.5 self-start sm:self-auto shrink-0"
          >
            <Plus className="size-4" />
            <span>Add Certification</span>
          </button>
        )}
      </div>

      {/* Summary stats pill bar */}
      {!loading && !error && certifications.length > 0 && (
        <div className="flex items-center gap-4 text-xs font-mono text-muted border-b border-line pb-3">
          <span>
            Total: <strong className="text-ink">{certifications.length}</strong>
          </span>
          <span>•</span>
          <span>
            Visible: <strong className="text-accent">{visibleCount}</strong>
          </span>
          <span>•</span>
          <span>
            Featured: <strong className="text-amber-400">{featuredCount}</strong>
          </span>
        </div>
      )}

      {/* Add / Edit Form Card */}
      {editingItem && (
        <form
          onSubmit={handleSave}
          className="card p-6 border-line space-y-6 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <p className="eyebrow mb-0.5">Certification Editor</p>
              <h2 className="text-base font-bold text-ink">
                {editingItem.id ? 'Edit Certification' : 'New Certification'}
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
              label="Certification Title"
              required
              value={editingItem.title || ''}
              onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
              placeholder="e.g. AWS Certified Solutions Architect - Professional"
            />
            <Field
              label="Issuer Organization"
              required
              value={editingItem.issuer || ''}
              onChange={(e) => setEditingItem({ ...editingItem, issuer: e.target.value })}
              placeholder="e.g. Amazon Web Services, Google Cloud, Microsoft"
            />
          </div>

          {/* Month Inputs (stored as YYYY-MM-01) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              type="month"
              label="Issue Date (Month / Year)"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              hint="Month and year certification was awarded"
              className="[color-scheme:dark]"
            />
            <Field
              type="month"
              label="Expiration Date (Month / Year)"
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
              hint="Leave empty if no expiration / lifetime validity"
              className="[color-scheme:dark]"
            />
          </div>

          {/* Credential PDF Upload & URL */}
          <div className="space-y-4 pt-2 border-t border-line">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-muted mb-1.5">
                Credential Document (PDF)
              </p>
              {editingItem.credential_url ? (
                <div className="border border-line bg-surface p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 border border-line bg-bg text-accent shrink-0">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">Credential Document</p>
                      <p className="text-xs text-muted truncate font-mono">
                        {editingItem.credential_url}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={editingItem.credential_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 border border-line bg-bg text-muted hover:text-ink transition-colors"
                      title="View PDF"
                    >
                      <ExternalLink className="size-4" />
                    </a>
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
                  folder="certifications"
                  accept=".pdf,application/pdf"
                  onUploaded={handlePdfUploaded}
                  hint="Upload credential verification PDF to the portfolio bucket (up to 10 MB)"
                />
              )}
            </div>

            {/* Manual Credential URL alternative */}
            {!editingItem.credential_url && (
              <Field
                label="Or Verification / Badge Link (URL)"
                value={editingItem.credential_url || ''}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, credential_url: e.target.value })
                }
                placeholder="https://www.credly.com/badges/..."
                hint="Alternatively, provide a direct verification link from Credly, Accredible, etc."
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-line p-4 bg-bg/40">
            <Toggle
              label="Featured Certification"
              description="Highlight this credential prominently with a star badge"
              checked={editingItem.featured ?? false}
              onChange={(checked) => setEditingItem({ ...editingItem, featured: checked })}
            />
            <Toggle
              label="Visible on website"
              description="Display this credential on your public certifications section"
              checked={editingItem.visible ?? true}
              onChange={(checked) => setEditingItem({ ...editingItem, visible: checked })}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
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
              <span>{savingItem ? 'Saving...' : editingItem.id ? 'Save Changes' : 'Create Certification'}</span>
            </button>
          </div>

          {formError && (
            <p className="text-xs text-rose-400 p-2.5 border border-rose-500/30 bg-rose-500/10">
              {formError}
            </p>
          )}
        </form>
      )}

      {/* Certifications List */}
      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="size-8 text-accent animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm">
          <p className="font-semibold mb-1">Failed to load certifications</p>
          <p className="text-xs">{error}</p>
        </div>
      ) : certifications.length === 0 ? (
        <EmptyState
          title="No certifications yet"
          description="Showcase your professional certifications, cloud accreditations, and licenses."
          action={{
            label: 'Add First Certification',
            onClick: handleNew,
          }}
        />
      ) : (
        <div className="space-y-3">
          {certifications.map((item, index) => {
            const startDisplay = formatMonthDisplay(item.start_date)
            const endDisplay = formatMonthDisplay(item.end_date)
            let dateText = ''
            if (startDisplay && endDisplay) {
              dateText = `${startDisplay} – ${endDisplay}`
            } else if (startDisplay) {
              dateText = `Issued ${startDisplay} · No Expiration`
            }

            return (
              <div
                key={item.id}
                className="card p-4 border-line flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-line/80 transition-colors"
              >
                {/* Left icon + details */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="p-3 border border-line bg-bg text-amber-400 shrink-0">
                    <Award className="size-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-base font-bold text-ink">{item.title}</span>
                      {item.featured && (
                        <span className="inline-flex items-center gap-1 font-mono text-[0.65rem] uppercase px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400">
                          <Star className="size-2.5 fill-amber-400" />
                          Featured
                        </span>
                      )}
                      {!item.visible && (
                        <span className="font-mono text-[0.65rem] uppercase px-1.5 py-0.5 bg-bg border border-line text-muted">
                          Hidden
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-ink/90 font-medium">{item.issuer}</p>

                    <div className="flex items-center gap-3 mt-1 flex-wrap text-xs">
                      {dateText && <span className="font-mono text-muted">{dateText}</span>}

                      {item.credential_url && (
                        <a
                          href={item.credential_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-accent hover:underline"
                        >
                          <span>Credential</span>
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-line w-full md:w-auto justify-end">
                  {/* Featured Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleFeatured(item.id)}
                    className={`px-2 py-1 font-mono text-[0.7rem] uppercase tracking-wider border transition-colors flex items-center gap-1 ${
                      item.featured
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                        : 'border-line bg-bg text-muted hover:text-ink'
                    }`}
                    title={item.featured ? 'Unmark as featured' : 'Mark as featured'}
                  >
                    <Star
                      className={`size-3 ${
                        item.featured ? 'fill-amber-400 text-amber-400' : 'text-muted'
                      }`}
                    />
                    <span>{item.featured ? 'Featured' : 'Feature'}</span>
                  </button>

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
                      disabled={index === certifications.length - 1}
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
                    title="Edit certification"
                  >
                    <Pencil className="size-3.5" />
                  </button>

                  {/* Delete button with confirm */}
                  <ConfirmButton
                    onConfirm={() => handleDelete(item)}
                    confirmText="Delete certification?"
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
