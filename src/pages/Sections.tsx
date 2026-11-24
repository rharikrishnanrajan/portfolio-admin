import { useEffect, useState, useRef } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Globe,
  GlobeLock,
  ImagePlus,
  Layers,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useCrud } from '../lib/useCrud'
import { friendlyErrorMessage } from '../lib/errors'
import { uploadFile, removeFile, safeName } from '../lib/storage'
import { emptyToNull } from '../lib/validation'
import { safeUrl, safeImageUrl } from '../lib/safeUrl'
import {
  PageHeader,
  Field,
  TextArea,
  ConfirmButton,
  EmptyState,
  useToast,
} from '../components/ui'
import type {
  SectionRow,
  SectionType,
  SectionContentRichText,
  SectionContentCardsItem,
} from '../types/rows'

// Built-in section types that can never be deleted
const BUILTIN_TYPES: SectionType[] = [
  'about', 'skills', 'projects', 'publications', 'education', 'certifications', 'contact',
]
const RESERVED_SLUGS = ['hero', 'home', 'top', 'admin', 'login', 'api']

function isBuiltin(section: SectionRow): boolean {
  return BUILTIN_TYPES.includes(section.type as SectionType)
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

type CustomType = 'rich_text' | 'cards' | 'gallery'

interface CardItem {
  title: string
  text: string
  url: string
}

interface GalleryImage {
  url: string
  path: string
  caption: string
}

export default function Sections() {
  const { toast } = useToast()
  const {
    rows: sections,
    loading,
    error,
    reload,
    move,
    toggle,
  } = useCrud<SectionRow>('sections', { orderBy: 'position', ascending: true })

  // ----- Edit metadata form state -----
  const [editingMeta, setEditingMeta] = useState<SectionRow | null>(null)
  const [metaNavLabel, setMetaNavLabel] = useState('')
  const [metaEyebrow, setMetaEyebrow] = useState('')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaSubtitle, setMetaSubtitle] = useState('')
  const [savingMeta, setSavingMeta] = useState(false)
  const [metaError, setMetaError] = useState<string | null>(null)
  const metaErrorRef = useRef<HTMLParagraphElement>(null)

  // ----- Create custom section form state -----
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newType, setNewType] = useState<CustomType>('rich_text')
  const [savingNew, setSavingNew] = useState(false)
  const [newError, setNewError] = useState<string | null>(null)
  const newErrorRef = useRef<HTMLParagraphElement>(null)

  // ----- Content editor for custom sections -----
  const [editingContent, setEditingContent] = useState<SectionRow | null>(null)
  const [richBody, setRichBody] = useState('')
  const [cardItems, setCardItems] = useState<CardItem[]>([])
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])
  const [savingContent, setSavingContent] = useState(false)
  const [contentError, setContentError] = useState<string | null>(null)
  const contentErrorRef = useRef<HTMLParagraphElement>(null)
  const [galleryUploading, setGalleryUploading] = useState(false)

  // Auto-generate slug from title while creating
  useEffect(() => {
    if (creating && newTitle) {
      setNewSlug(slugify(newTitle))
    }
  }, [newTitle, creating])

  // ---- Metadata edit ----
  const openMeta = (s: SectionRow) => {
    setEditingMeta(s)
    setMetaNavLabel(s.nav_label || '')
    setMetaEyebrow(s.eyebrow || '')
    setMetaTitle(s.title || '')
    setMetaSubtitle(s.subtitle || '')
    setMetaError(null)
    setEditingContent(null)
  }

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMeta) return
    setSavingMeta(true)
    setMetaError(null)
    try {
      let updateQuery = supabase
        .from('sections')
        .update({
          nav_label: emptyToNull(metaNavLabel),
          eyebrow: emptyToNull(metaEyebrow),
          title: emptyToNull(metaTitle),
          subtitle: emptyToNull(metaSubtitle),
        })
        .eq('id', editingMeta.id)

      if (editingMeta.updated_at) {
        updateQuery = updateQuery.eq('updated_at', editingMeta.updated_at)
      }

      const { data, error: err } = await updateQuery.select()
      if (err) throw err
      if (!data || data.length === 0) {
        if (editingMeta.updated_at) {
          throw new Error('This item was changed elsewhere. Reload and try again.')
        }
        throw new Error('No row updated. Check permissions.')
      }
      toast.success('Section metadata saved.')
      setEditingMeta(null)
      await reload()
    } catch (err) {
      const msg = friendlyErrorMessage(err)
      setMetaError(msg)
      toast.error(msg)
      metaErrorRef.current?.scrollIntoView({ block: 'center' })
      setTimeout(() => metaErrorRef.current?.scrollIntoView({ block: 'center' }), 0)
    } finally {
      setSavingMeta(false)
    }
  }

  // ---- Create custom section ----
  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault()
    setNewError(null)

    const title = newTitle.trim()
    const slug = newSlug.trim()

    if (!title) {
      const msg = 'Title is required.'
      setNewError(msg); toast.error(msg)
      newErrorRef.current?.scrollIntoView({ block: 'center' })
      return
    }
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      const msg = 'Slug must contain only lowercase letters, numbers, and hyphens.'
      setNewError(msg); toast.error(msg)
      newErrorRef.current?.scrollIntoView({ block: 'center' })
      return
    }
    if (RESERVED_SLUGS.includes(slug)) {
      const msg = `Slug "${slug}" is reserved and cannot be used.`
      setNewError(msg); toast.error(msg)
      newErrorRef.current?.scrollIntoView({ block: 'center' })
      return
    }
    if (sections.some((s) => s.slug === slug)) {
      const msg = `Slug "${slug}" is already in use.`
      setNewError(msg); toast.error(msg)
      newErrorRef.current?.scrollIntoView({ block: 'center' })
      return
    }

    setSavingNew(true)
    try {
      const maxPos = sections.reduce((m, s) => (s.position > m ? s.position : m), 0)
      const defaultContent: Record<string, unknown> =
        newType === 'rich_text' ? { body: '' }
        : newType === 'cards' ? { items: [] }
        : { images: [] }

      const { data, error: err } = await supabase
        .from('sections')
        .insert({
          slug,
          type: newType,
          nav_label: title,
          title,
          eyebrow: null,
          subtitle: null,
          content: defaultContent,
          position: maxPos + 10,
          visible: true,
          show_in_nav: false,
        })
        .select()
      if (err) throw err
      if (!data || data.length === 0) throw new Error('Insert returned no rows.')

      toast.success(`Custom section "${title}" created.`)
      setCreating(false)
      setNewTitle('')
      setNewSlug('')
      setNewType('rich_text')
      await reload()
    } catch (err) {
      const msg = friendlyErrorMessage(err)
      setNewError(msg); toast.error(msg)
      newErrorRef.current?.scrollIntoView({ block: 'center' })
      setTimeout(() => newErrorRef.current?.scrollIntoView({ block: 'center' }), 0)
    } finally {
      setSavingNew(false)
    }
  }

  // ---- Delete custom section (also removes storage files) ----
  const handleDelete = async (section: SectionRow) => {
    try {
      // 1) Delete database row first (and confirm row was returned)
      const { data, error: err } = await supabase
        .from('sections')
        .delete()
        .eq('id', section.id)
        .select()
      if (err) throw err
      if (!data || data.length === 0) {
        throw new Error('No row was deleted.')
      }

      // 2) Only delete storage files AFTER database row deletion is confirmed
      if (section.type === 'gallery') {
        const content = section.content as { images?: GalleryImage[] }
        if (content?.images) {
          for (const img of content.images) {
            if (img.path) {
              try { await removeFile('portfolio', img.path) } catch { /* ignore */ }
            }
          }
        }
      }

      toast.success('Section deleted.')
      await reload()
    } catch (err) {
      const msg = friendlyErrorMessage(err)
      toast.error(`Failed to delete: ${msg}`)
    }
  }

  // ---- Toggle handlers ----
  const handleToggleVisible = async (id: string) => {
    try { await toggle(id, 'visible') }
    catch (err) { toast.error(friendlyErrorMessage(err)) }
  }
  const handleToggleNav = async (id: string) => {
    try { await toggle(id, 'show_in_nav') }
    catch (err) { toast.error(friendlyErrorMessage(err)) }
  }
  const handleMove = async (id: string, dir: 'up' | 'down') => {
    try { await move(id, dir) }
    catch (err) { toast.error(friendlyErrorMessage(err)) }
  }

  // ---- Content editor ----
  const openContent = (s: SectionRow) => {
    setEditingContent(s)
    setEditingMeta(null)
    setContentError(null)
    if (s.type === 'rich_text') {
      const c = s.content as SectionContentRichText
      setRichBody(c?.body || '')
    } else if (s.type === 'cards') {
      const c = s.content as { items?: SectionContentCardsItem[] }
      setCardItems((c?.items || []).map((it) => ({
        title: it.title || '',
        text: it.text || '',
        url: it.url || '',
      })))
    } else if (s.type === 'gallery') {
      const c = s.content as { images?: GalleryImage[] }
      setGalleryImages((c?.images || []).map((im) => ({
        url: im.url || '',
        path: im.path || '',
        caption: im.caption || '',
      })))
    }
  }

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingContent) return
    setSavingContent(true)
    setContentError(null)
    try {
      // Build merged content
      const existing = (editingContent.content as Record<string, unknown>) || {}
      let newContent: Record<string, unknown>
      if (editingContent.type === 'rich_text') {
        newContent = { ...existing, body: richBody }
      } else if (editingContent.type === 'cards') {
        for (const it of cardItems) {
          if (it.url && it.url.trim() && !safeUrl(it.url.trim(), { allowMailtoTel: true })) {
            throw new Error(`Card "${it.title || 'Untitled'}" has an invalid URL. Must start with http://, https://, mailto:, or tel:`)
          }
        }
        newContent = {
          ...existing,
          items: cardItems.map((it) => ({
            title: it.title.trim(),
            text: it.text.trim(),
            url: emptyToNull(it.url),
          })),
        }
      } else {
        // gallery — images already managed in state
        newContent = {
          ...existing,
          images: galleryImages.map((im) => ({
            url: im.url,
            path: im.path,
            caption: emptyToNull(im.caption),
          })),
        }
      }

      let updateQuery = supabase
        .from('sections')
        .update({ content: newContent })
        .eq('id', editingContent.id)

      if (editingContent.updated_at) {
        updateQuery = updateQuery.eq('updated_at', editingContent.updated_at)
      }

      const { data, error: err } = await updateQuery.select()
      if (err) throw err
      if (!data || data.length === 0) {
        if (editingContent.updated_at) {
          throw new Error('This item was changed elsewhere. Reload and try again.')
        }
        throw new Error('No row updated.')
      }
      toast.success('Section content saved.')
      setEditingContent(null)
      await reload()
    } catch (err) {
      const msg = friendlyErrorMessage(err)
      setContentError(msg); toast.error(msg)
      contentErrorRef.current?.scrollIntoView({ block: 'center' })
      setTimeout(() => contentErrorRef.current?.scrollIntoView({ block: 'center' }), 0)
    } finally {
      setSavingContent(false)
    }
  }

  // ---- Gallery upload ----
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingContent || editingContent.type !== 'gallery') return
    const file = e.target.files?.[0]
    if (!file) return
    setGalleryUploading(true)
    let uploadedPath: string | null = null

    try {
      const safeSlug = editingContent.slug.replace(/[^a-z0-9_-]+/g, '-')
      const path = `sections/${safeSlug}/${safeName(file.name)}`

      // 1) upload the new file
      const uploadResult = await uploadFile('portfolio', path, file)
      uploadedPath = uploadResult.path

      const nextImages = [...galleryImages, { url: uploadResult.url, path: uploadResult.path, caption: '' }]
      const existing = (editingContent.content as Record<string, unknown>) || {}
      const newContent = {
        ...existing,
        images: nextImages.map((im) => ({
          url: im.url,
          path: im.path,
          caption: emptyToNull(im.caption),
        })),
      }

      // 2) save the row with the new URL (and confirm a row was returned)
      let updateQuery = supabase
        .from('sections')
        .update({ content: newContent })
        .eq('id', editingContent.id)

      if (editingContent.updated_at) {
        updateQuery = updateQuery.eq('updated_at', editingContent.updated_at)
      }

      const { data, error: err } = await updateQuery.select()
      if (err) throw err
      if (!data || data.length === 0) {
        throw new Error(
          editingContent.updated_at
            ? 'This item was changed elsewhere. Reload and try again.'
            : 'No row updated.'
        )
      }

      const updatedRow = data[0] as SectionRow
      setEditingContent(updatedRow)
      setGalleryImages(nextImages)
      toast.success('Image uploaded and saved.')
      await reload()
    } catch (err) {
      // If step 2 fails, delete the NEW file instead so it is not orphaned, and keep the old one.
      if (uploadedPath) {
        try {
          await removeFile('portfolio', uploadedPath)
        } catch (cleanupErr) {
          console.warn('Could not clean up uploaded gallery image:', cleanupErr)
        }
      }
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setGalleryUploading(false)
      e.target.value = ''
    }
  }

  const handleRemoveGalleryImage = async (index: number) => {
    if (!editingContent) return
    const imgToRemove = galleryImages[index]
    const nextImages = galleryImages.filter((_, i) => i !== index)
    const existing = (editingContent.content as Record<string, unknown>) || {}
    const newContent = {
      ...existing,
      images: nextImages.map((im) => ({
        url: im.url,
        path: im.path,
        caption: emptyToNull(im.caption),
      })),
    }

    try {
      // 1) save the row with the URL cleared (and confirm a row was returned)
      let updateQuery = supabase
        .from('sections')
        .update({ content: newContent })
        .eq('id', editingContent.id)

      if (editingContent.updated_at) {
        updateQuery = updateQuery.eq('updated_at', editingContent.updated_at)
      }

      const { data, error: err } = await updateQuery.select()
      if (err) throw err
      if (!data || data.length === 0) {
        throw new Error(
          editingContent.updated_at
            ? 'This item was changed elsewhere. Reload and try again.'
            : 'No row updated.'
        )
      }

      const updatedRow = data[0] as SectionRow
      setEditingContent(updatedRow)
      setGalleryImages(nextImages)

      // 2) Deleting a file via a Remove button must also happen only after the row is saved with the URL cleared
      if (imgToRemove.path) {
        try {
          await removeFile('portfolio', imgToRemove.path)
        } catch (storageErr) {
          console.warn('Could not remove gallery image from storage:', storageErr)
        }
      }
      toast.success('Image removed.')
      await reload()
    } catch (err) {
      const msg = friendlyErrorMessage(err)
      toast.error(`Failed to remove image: ${msg}`)
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="size-8 text-accent animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-8 text-center max-w-lg mx-auto">
        <p className="eyebrow text-rose-400 mb-2">Error</p>
        <p className="text-sm text-muted mb-4">{error}</p>
        <button type="button" onClick={() => void reload()} className="btn-primary">Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <PageHeader
          eyebrow="Navigation & Layout"
          title="Sections"
          description="Reorder, show/hide, and configure the sections of your portfolio. Built-in sections can be renamed and reordered but not deleted."
        />
        {!creating && !editingMeta && !editingContent && (
          <button
            type="button"
            onClick={() => { setCreating(true); setNewError(null) }}
            className="btn-primary flex items-center gap-2 text-xs py-2 px-3.5 self-start shrink-0"
          >
            <Plus className="size-4" />
            <span>Add Custom Section</span>
          </button>
        )}
      </div>

      {/* Create custom section form */}
      {creating && (
        <form
          onSubmit={handleCreateSection}
          className="card p-6 border-line space-y-5 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <p className="eyebrow mb-0.5">New Section</p>
              <h2 className="text-base font-bold text-ink">Create Custom Section</h2>
            </div>
            <button type="button" onClick={() => setCreating(false)} className="text-muted hover:text-ink p-1">
              <X className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Title"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Testimonials"
            />
            <Field
              label="Slug"
              required
              value={newSlug}
              onChange={(e) => setNewSlug(slugify(e.target.value))}
              placeholder="e.g. testimonials"
              hint="Auto-generated from title. Only a-z, 0-9, hyphens."
            />
          </div>

          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-muted mb-1.5">
              Section Type
            </label>
            <div className="flex gap-3 flex-wrap">
              {(['rich_text', 'cards', 'gallery'] as CustomType[]).map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sectionType"
                    value={t}
                    checked={newType === t}
                    onChange={() => setNewType(t)}
                    className="accent-accent"
                  />
                  <span className="font-mono text-xs text-ink uppercase tracking-wider">{t.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted mt-1.5">
              {newType === 'rich_text' && 'A freeform markdown/text body field.'}
              {newType === 'cards' && 'A list of cards each with title, text, and optional URL.'}
              {newType === 'gallery' && 'A grid of images with captions, stored in the portfolio bucket.'}
            </p>
          </div>

          {newError && <p ref={newErrorRef} className="text-xs text-rose-400 p-2.5 border border-rose-500/30 bg-rose-500/10">{newError}</p>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <button type="button" onClick={() => setCreating(false)} disabled={savingNew}
              className="px-4 py-2 border border-line bg-surface text-xs font-mono uppercase tracking-wider text-muted hover:text-ink disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={savingNew} className="btn-primary text-xs py-2 px-5 flex items-center gap-2">
              {savingNew && <Loader2 className="size-3.5 animate-spin" />}
              <span>{savingNew ? 'Creating...' : 'Create Section'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Meta editor */}
      {editingMeta && (
        <form onSubmit={handleSaveMeta} className="card p-6 border-line space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <p className="eyebrow mb-0.5">Section Editor</p>
              <h2 className="text-base font-bold text-ink">Edit "{editingMeta.nav_label || editingMeta.slug}"</h2>
              {isBuiltin(editingMeta) && (
                <span className="inline-flex items-center gap-1 font-mono text-[0.65rem] uppercase px-1.5 py-0.5 border border-accent/40 bg-accent/10 text-accent mt-1">
                  <Lock className="size-3" /> Built-in — slug & type locked
                </span>
              )}
            </div>
            <button type="button" onClick={() => setEditingMeta(null)} className="text-muted hover:text-ink p-1">
              <X className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isBuiltin(editingMeta) ? (
              <>
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-muted mb-1.5">Slug (locked)</p>
                  <p className="input bg-surface text-muted cursor-not-allowed">{editingMeta.slug}</p>
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-muted mb-1.5">Type (locked)</p>
                  <p className="input bg-surface text-muted cursor-not-allowed">{editingMeta.type}</p>
                </div>
              </>
            ) : null}
            <Field label="Nav Label" value={metaNavLabel} onChange={(e) => setMetaNavLabel(e.target.value)} placeholder="e.g. About" />
            <Field label="Eyebrow" value={metaEyebrow} onChange={(e) => setMetaEyebrow(e.target.value)} placeholder="e.g. The Story" />
            <Field label="Title" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="e.g. About Me" />
            <Field label="Subtitle" value={metaSubtitle} onChange={(e) => setMetaSubtitle(e.target.value)} placeholder="e.g. Building things that matter" />
          </div>

          {metaError && <p ref={metaErrorRef} className="text-xs text-rose-400 p-2.5 border border-rose-500/30 bg-rose-500/10">{metaError}</p>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <button type="button" onClick={() => setEditingMeta(null)} disabled={savingMeta}
              className="px-4 py-2 border border-line bg-surface text-xs font-mono uppercase tracking-wider text-muted hover:text-ink disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={savingMeta} className="btn-primary text-xs py-2 px-5 flex items-center gap-2">
              {savingMeta && <Loader2 className="size-3.5 animate-spin" />}
              <span>{savingMeta ? 'Saving...' : 'Save Metadata'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Content editor for custom sections */}
      {editingContent && (
        <form onSubmit={handleSaveContent} className="card p-6 border-line space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <p className="eyebrow mb-0.5">Content Editor</p>
              <h2 className="text-base font-bold text-ink">"{editingContent.nav_label || editingContent.slug}" Content</h2>
            </div>
            <button type="button" onClick={() => setEditingContent(null)} className="text-muted hover:text-ink p-1">
              <X className="size-4" />
            </button>
          </div>

          {editingContent.type === 'rich_text' && (
            <TextArea
              label="Body"
              value={richBody}
              onChange={(e) => setRichBody(e.target.value)}
              rows={10}
              placeholder="Enter your content here (markdown supported on the public site)..."
            />
          )}

          {editingContent.type === 'cards' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Cards ({cardItems.length})</p>
                <button type="button"
                  onClick={() => setCardItems([...cardItems, { title: '', text: '', url: '' }])}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono uppercase tracking-wider border border-line bg-surface hover:text-ink transition-colors">
                  <Plus className="size-3.5" /> Add Card
                </button>
              </div>
              {cardItems.length === 0 && (
                <EmptyState title="No cards yet" description="Click 'Add Card' to create the first card." />
              )}
              <div className="space-y-3">
                {cardItems.map((item, i) => (
                  <div key={i} className="border border-line p-4 space-y-3 bg-surface">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-muted">Card {i + 1}</span>
                      <button type="button" onClick={() => setCardItems(cardItems.filter((_, idx) => idx !== i))}
                        className="text-muted hover:text-rose-400 p-1">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <Field label="Title" required value={item.title}
                      onChange={(e) => setCardItems(cardItems.map((c, idx) => idx === i ? { ...c, title: e.target.value } : c))} />
                    <TextArea label="Text" value={item.text} rows={2}
                      onChange={(e) => setCardItems(cardItems.map((c, idx) => idx === i ? { ...c, text: e.target.value } : c))} />
                    <Field label="URL (optional)" value={item.url}
                      onChange={(e) => setCardItems(cardItems.map((c, idx) => idx === i ? { ...c, url: e.target.value } : c))}
                      placeholder="https://..." hint="Optional link" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {editingContent.type === 'gallery' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Gallery Images ({galleryImages.length})</p>
                <label className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono uppercase tracking-wider border border-line bg-surface hover:text-ink transition-colors cursor-pointer ${galleryUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {galleryUploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
                  <span>Upload Image</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/avif" className="sr-only"
                    onChange={handleGalleryUpload} disabled={galleryUploading} />
                </label>
              </div>
              {galleryImages.length === 0 && (
                <EmptyState title="No images yet" description="Upload images to build your gallery." />
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {galleryImages.map((img, i) => (
                  <div key={i} className="border border-line bg-surface">
                    <div className="relative">
                      <img src={safeImageUrl(img.url) || ''} alt={img.caption || `Image ${i + 1}`}
                        className="w-full h-32 object-cover" />
                      <button type="button"
                        onClick={() => void handleRemoveGalleryImage(i)}
                        className="absolute top-1 right-1 p-1 bg-bg/80 border border-line text-muted hover:text-rose-400 transition-colors">
                        <X className="size-3.5" />
                      </button>
                    </div>
                    <div className="p-2">
                      <input type="text" value={img.caption}
                        onChange={(e) => setGalleryImages(galleryImages.map((gi, idx) => idx === i ? { ...gi, caption: e.target.value } : gi))}
                        placeholder="Caption (optional)"
                        className="input py-1 text-xs"
                        aria-label={`Caption for image ${i + 1}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {contentError && <p ref={contentErrorRef} className="text-xs text-rose-400 p-2.5 border border-rose-500/30 bg-rose-500/10">{contentError}</p>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <button type="button" onClick={() => setEditingContent(null)} disabled={savingContent}
              className="px-4 py-2 border border-line bg-surface text-xs font-mono uppercase tracking-wider text-muted hover:text-ink disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={savingContent} className="btn-primary text-xs py-2 px-5 flex items-center gap-2">
              {savingContent && <Loader2 className="size-3.5 animate-spin" />}
              <span>{savingContent ? 'Saving...' : 'Save Content'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Sections list */}
      {sections.length === 0 ? (
        <EmptyState title="No sections found" description="Sections should already exist in the database." />
      ) : (
        <div className="space-y-2">
          {sections.map((section, index) => {
            const builtin = isBuiltin(section)
            return (
              <div key={section.id}
                className="card p-4 border-line flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-line/80 transition-colors">
                {/* Left: icon + details */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="p-2.5 border border-line bg-bg text-accent shrink-0">
                    <Layers className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-bold text-ink">{section.nav_label || section.slug}</span>
                      {builtin && (
                        <span className="inline-flex items-center gap-1 font-mono text-[0.65rem] uppercase px-1.5 py-0.5 border border-accent/30 bg-accent/10 text-accent">
                          <Lock className="size-2.5" /> Built-in
                        </span>
                      )}
                      {!section.visible && (
                        <span className="font-mono text-[0.65rem] uppercase px-1.5 py-0.5 bg-bg border border-line text-muted">Hidden</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted font-mono flex-wrap">
                      <span>{section.slug}</span>
                      <span>•</span>
                      <span>{section.type}</span>
                      {section.title && <><span>•</span><span className="text-ink/70">{section.title}</span></>}
                    </div>
                  </div>
                </div>

                {/* Right: controls */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {/* Visible toggle */}
                  <button type="button" onClick={() => void handleToggleVisible(section.id)}
                    title={section.visible ? 'Hide section' : 'Show section'}
                    className={`p-1.5 border transition-colors ${section.visible ? 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20' : 'border-line bg-bg text-muted hover:text-ink'}`}>
                    {section.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  </button>

                  {/* show_in_nav toggle */}
                  <button type="button" onClick={() => void handleToggleNav(section.id)}
                    title={section.show_in_nav ? 'Remove from nav' : 'Show in nav'}
                    className={`p-1.5 border transition-colors ${section.show_in_nav ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'border-line bg-bg text-muted hover:text-ink'}`}>
                    {section.show_in_nav ? <Globe className="size-3.5" /> : <GlobeLock className="size-3.5" />}
                  </button>

                  {/* Reorder */}
                  <div className="flex items-center border border-line bg-bg">
                    <button type="button" disabled={index === 0} onClick={() => void handleMove(section.id, 'up')}
                      className="p-1.5 text-muted hover:text-ink disabled:opacity-20 transition-colors" title="Move up">
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button type="button" disabled={index === sections.length - 1} onClick={() => void handleMove(section.id, 'down')}
                      className="p-1.5 text-muted hover:text-ink disabled:opacity-20 transition-colors border-l border-line" title="Move down">
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>

                  {/* Edit metadata */}
                  <button type="button" onClick={() => openMeta(section)}
                    className="p-1.5 border border-line bg-bg text-muted hover:text-ink transition-colors" title="Edit metadata">
                    <Pencil className="size-3.5" />
                  </button>

                  {/* Edit content (custom only) */}
                  {!builtin && ['rich_text', 'cards', 'gallery'].includes(section.type) && (
                    <button type="button" onClick={() => openContent(section)}
                      className="px-2 py-1 font-mono text-[0.7rem] uppercase tracking-wider border border-line bg-bg text-muted hover:text-ink transition-colors"
                      title="Edit content">
                      Content
                    </button>
                  )}

                  {/* Delete (custom only) */}
                  {!builtin && (
                    <ConfirmButton
                      onConfirm={() => void handleDelete(section)}
                      confirmText="Delete this section? Storage files will also be removed."
                      confirmButtonText="Yes, delete"
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
