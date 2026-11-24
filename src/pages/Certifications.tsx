import { useState, useRef } from 'react'
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
import { supabase } from '../lib/supabase'
import { friendlyErrorMessage } from '../lib/errors'
import { extractStoragePath, removeFile } from '../lib/storage'
import { monthToDbDate, dbDateToMonth, formatMonthDisplay } from '../lib/date'
import { isValidUrl } from '../lib/validation'
import { safeUrl } from '../lib/safeUrl'
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
  const [credentialUrl, setCredentialUrl] = useState<string>('')
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
    setCredentialUrl('')
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
    setCredentialUrl(item.credential_url || '')
    setFormError(null)
  }

  const handleCancel = () => {
    setEditingItem(null)
    setStartMonth('')
    setEndMonth('')
    setCredentialUrl('')
    setFormError(null)
  }

  // Handle uploaded credential PDF
  const handlePdfUploaded = async (file: ProjectFile) => {
    const oldUrl = credentialUrl

    if (editingItem?.id) {
      try {
        // 2) save row with new URL (and confirm a row was returned)
        let updateQuery = supabase
          .from('certifications')
          .update({ credential_url: file.url })
          .eq('id', editingItem.id)

        if (editingItem.updated_at) {
          updateQuery = updateQuery.eq('updated_at', editingItem.updated_at)
        }

        const { data, error } = await updateQuery.select()
        if (error) throw error
        if (!data || data.length === 0) {
          throw new Error('Failed to update certification row.')
        }

        const updatedRow = data[0] as CertificationRow
        setEditingItem(updatedRow)
        setCredentialUrl(file.url)

        // 3) only then delete the old file
        if (oldUrl && oldUrl !== file.url && extractStoragePath('portfolio', oldUrl)) {
          await deleteStoragePdf(oldUrl)
        }

        toast.success('Credential PDF uploaded and saved.')
      } catch (err) {
        // If step 2 fails, delete the NEW file instead so it is not orphaned, and keep the old one.
        await deleteStoragePdf(file.url)
        const msg = friendlyErrorMessage(err)
        toast.error(`Failed to update credential PDF: ${msg}`)
        throw err
      }
    } else {
      setCredentialUrl(file.url)
      toast.success('Credential PDF uploaded.')
    }
  }

  // Handle remove credential PDF (deleting only after row is saved with URL cleared)
  const handleRemovePdf = async () => {
    const oldUrl = credentialUrl
    if (!oldUrl) return

    if (editingItem?.id) {
      try {
        // 1) save row with URL cleared (and confirm a row was returned)
        let updateQuery = supabase
          .from('certifications')
          .update({ credential_url: null })
          .eq('id', editingItem.id)

        if (editingItem.updated_at) {
          updateQuery = updateQuery.eq('updated_at', editingItem.updated_at)
        }

        const { data, error } = await updateQuery.select()
        if (error) throw error
        if (!data || data.length === 0) {
          throw new Error('Failed to update certification row.')
        }

        const updatedRow = data[0] as CertificationRow
        setEditingItem(updatedRow)
        setCredentialUrl('')

        // 2) Deleting a file via a Remove button must also happen only after the row is saved with the URL cleared
        if (extractStoragePath('portfolio', oldUrl)) {
          await deleteStoragePdf(oldUrl)
        }

        toast.info('Credential PDF removed.')
      } catch (err) {
        const msg = friendlyErrorMessage(err)
        toast.error(`Failed to remove credential PDF: ${msg}`)
      }
    } else {
      if (extractStoragePath('portfolio', oldUrl)) {
        await deleteStoragePdf(oldUrl)
      }
      setCredentialUrl('')
      toast.info('Credential PDF removed.')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    setFormError(null)
    if (!editingItem.title?.trim()) {
      const msg = 'Certification title is required.'
      setFormError(msg)
      toast.error(msg)
      formErrorRef.current?.scrollIntoView({ block: 'center' })
      setTimeout(() => formErrorRef.current?.scrollIntoView({ block: 'center' }), 0)
      return
    }
    if (!editingItem.issuer?.trim()) {
      const msg = 'Issuer organization is required.'
      setFormError(msg)
      toast.error(msg)
      formErrorRef.current?.scrollIntoView({ block: 'center' })
      setTimeout(() => formErrorRef.current?.scrollIntoView({ block: 'center' }), 0)
      return
    }

    const trimmedUrl = credentialUrl.trim()
    if (trimmedUrl && !isValidUrl(trimmedUrl)) {
      const msg = 'Credential URL must start with http:// or https://'
      setFormError(msg)
      toast.error(msg)
      formErrorRef.current?.scrollIntoView({ block: 'center' })
      setTimeout(() => formErrorRef.current?.scrollIntoView({ block: 'center' }), 0)
      return
    }
    if (startMonth && endMonth && endMonth < startMonth) {
      const msg = 'Expiration date cannot be earlier than issue date.'
      setFormError(msg)
      toast.error(msg)
      formErrorRef.current?.scrollIntoView({ block: 'center' })
      setTimeout(() => formErrorRef.current?.scrollIntoView({ block: 'center' }), 0)
      return
    }

    setSavingItem(true)
    const oldStorageUrl = editingItem.credential_url
    const finalCredentialUrl = trimmedUrl || null

    try {
      const dbStartDate = monthToDbDate(startMonth)
      const dbEndDate = monthToDbDate(endMonth)

      const payload: Partial<CertificationRow> = {
        ...editingItem,
        title: editingItem.title.trim(),
        issuer: editingItem.issuer.trim(),
        start_date: dbStartDate,
        end_date: dbEndDate,
        credential_url: finalCredentialUrl,
        featured: editingItem.featured ?? false,
        visible: editingItem.visible ?? true,
      }

      // 2) save row (and confirm row returned)
      const savedRow = await save(payload)

      if (!savedRow) {
        throw new Error('No row was updated. Check the id and your login.')
      }

      // 3) only then delete old file
      if (
        oldStorageUrl &&
        oldStorageUrl !== finalCredentialUrl &&
        extractStoragePath('portfolio', oldStorageUrl)
      ) {
        await deleteStoragePdf(oldStorageUrl)
      }

      toast.success(editingItem.id ? 'Certification updated.' : 'Certification created.')
      setEditingItem(null)
      setCredentialUrl('')
    } catch (err) {
      // If saving a new cert failed, and a new storage PDF was uploaded, delete the new PDF so it is not orphaned
      if (!editingItem.id && finalCredentialUrl && extractStoragePath('portfolio', finalCredentialUrl)) {
        await deleteStoragePdf(finalCredentialUrl)
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

  const handleDelete = async (cert: CertificationRow) => {
    try {
      // 1) Delete the row first (and confirm a row was deleted)
      await remove(cert.id)

      // 2) Only then clean up storage PDF if attached
      if (cert.credential_url) {
        await deleteStoragePdf(cert.credential_url)
      }
      toast.success('Certification deleted.')
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

  const handleToggleFeatured = async (id: string) => {
    try {
      await toggle(id, 'featured')
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
              label="Start"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              hint="Month and year certification was awarded"
              className="scheme-dark"
            />
            <Field
              type="month"
              label="End"
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
              hint="Leave empty if no expiration / lifetime validity"
              className="scheme-dark"
            />
          </div>

          {/* Credential URL & Document Upload */}
          <div className="space-y-4 pt-2 border-t border-line">
            <Field
              label="Credential URL / Verification Link"
              value={credentialUrl}
              onChange={(e) => setCredentialUrl(e.target.value)}
              placeholder="https://www.credly.com/badges/... or upload a PDF below"
              hint="External badge link, verification URL, or auto-filled when uploading a certificate PDF. Empty box saves null."
            />

            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-muted mb-1.5">
                Credential Document (PDF)
              </p>
              {credentialUrl && extractStoragePath('portfolio', credentialUrl) ? (
                <div className="border border-line bg-surface p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 border border-line bg-bg text-accent shrink-0">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">Attached Storage Document</p>
                      <p className="text-xs text-muted truncate font-mono">
                        {credentialUrl}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {safeUrl(credentialUrl) ? (
                      <a
                        href={safeUrl(credentialUrl)!}
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
                  folder="certifications"
                  accept=".pdf,application/pdf"
                  onUploaded={handlePdfUploaded}
                  hint="Upload certificate verification PDF to the portfolio bucket (auto-populates Credential URL above)"
                />
              )}
            </div>
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
            <p
              ref={formErrorRef}
              className="text-xs text-rose-400 p-2.5 border border-rose-500/30 bg-rose-500/10"
            >
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

                      {safeUrl(item.credential_url) ? (
                        <a
                          href={safeUrl(item.credential_url)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-accent hover:underline"
                        >
                          <span>Credential</span>
                          <ExternalLink className="size-3" />
                        </a>
                      ) : null}
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
