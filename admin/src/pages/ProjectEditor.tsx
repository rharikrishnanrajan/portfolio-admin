import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  FolderKanban,
  Loader2,
  Lock,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { isValidUrl } from '../lib/validation'
import {
  PageHeader,
  Field,
  TextArea,
  Toggle,
  TagInput,
  ListEditor,
  ImageUpload,
  FileUpload,
  FileListItem,
  ConfirmButton,
  useToast,
} from '../components/ui'
import {
  deleteProjectStorage,
  deleteProjectCover,
  deleteProjectDocument,
} from '../lib/projectStorage'
import type { ProjectFile, ProjectRow } from '../types/rows'

export default function ProjectEditor() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const { toast } = useToast()

  const [project, setProject] = useState<Partial<ProjectRow>>({
    title: '',
    kicker: '',
    tagline: '',
    summary: '',
    outcome: '',
    bullets: [],
    tech: [],
    github_url: '',
    live_url: '',
    cover_url: null,
    files: [],
    featured: false,
    visible: true,
  })

  const [loading, setLoading] = useState<boolean>(!isNew)
  const [saving, setSaving] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState<boolean>(false)

  // Fetch existing project if editing
  useEffect(() => {
    if (isNew) return

    const fetchProject = async () => {
      setLoading(true)
      setFormError(null)
      setNotFound(false)
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            setNotFound(true)
            return
          }
          throw error
        }

        const row = data as unknown as ProjectRow
        setProject({
          ...row,
          kicker: row.kicker || '',
          tagline: row.tagline || '',
          summary: row.summary || '',
          outcome: row.outcome || '',
          github_url: row.github_url || '',
          live_url: row.live_url || '',
          bullets: Array.isArray(row.bullets) ? row.bullets : [],
          tech: Array.isArray(row.tech) ? row.tech : [],
          files: Array.isArray(row.files) ? row.files : [],
          cover_url: row.cover_url || null,
          featured: row.featured ?? false,
          visible: row.visible ?? true,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setFormError(msg)
      } finally {
        setLoading(false)
      }
    }

    void fetchProject()
  }, [id, isNew])

  // Form validation
  const validateForm = (): boolean => {
    if (!project.title || !project.title.trim()) {
      setFormError('Project title is required.')
      return false
    }
    if (project.github_url && !isValidUrl(project.github_url)) {
      setFormError('GitHub URL must start with http:// or https://')
      return false
    }
    if (project.live_url && !isValidUrl(project.live_url)) {
      setFormError('Live Demo URL must start with http:// or https://')
      return false
    }
    return true
  }

  // Handle Save (insert row first for new project to get id, then update)
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setFormError(null)

    if (!validateForm()) return

    setSaving(true)
    try {
      if (isNew) {
        // Compute position: (max position) + 10
        const { data: maxRow } = await supabase
          .from('projects')
          .select('position')
          .order('position', { ascending: false })
          .limit(1)
          .maybeSingle()

        const maxPos = typeof maxRow?.position === 'number' ? maxRow.position : 0
        const position = maxPos + 10

        const newProjectData = {
          title: project.title!.trim(),
          kicker: project.kicker?.trim() || null,
          tagline: project.tagline?.trim() || null,
          summary: project.summary?.trim() || null,
          outcome: project.outcome?.trim() || null,
          bullets: project.bullets || [],
          tech: project.tech || [],
          github_url: project.github_url?.trim() || null,
          live_url: project.live_url?.trim() || null,
          cover_url: null,
          files: [],
          featured: project.featured ?? false,
          visible: project.visible ?? true,
          position,
        }

        const { data, error } = await supabase
          .from('projects')
          .insert(newProjectData)
          .select()
          .single()

        if (error) throw error
        if (!data) {
          throw new Error('No row was inserted. Check your permissions and try again.')
        }

        const saved = data as unknown as ProjectRow
        setProject(saved)
        toast.success('Project created. Uploads are now enabled.')
        // Transition to /projects/:id with replace so back button works nicely
        navigate(`/projects/${saved.id}`, { replace: true })
      } else {
        const updateData = {
          title: project.title!.trim(),
          kicker: project.kicker?.trim() || null,
          tagline: project.tagline?.trim() || null,
          summary: project.summary?.trim() || null,
          outcome: project.outcome?.trim() || null,
          bullets: project.bullets || [],
          tech: project.tech || [],
          github_url: project.github_url?.trim() || null,
          live_url: project.live_url?.trim() || null,
          cover_url: project.cover_url || null,
          files: project.files || [],
          featured: project.featured ?? false,
          visible: project.visible ?? true,
        }

        const { data, error } = await supabase
          .from('projects')
          .update(updateData)
          .eq('id', id)
          .select()

        if (error) throw error
        if (!data || data.length === 0) {
          throw new Error('No row was updated. Check the id and your login.')
        }

        const saved = data[0] as unknown as ProjectRow
        setProject(saved)
        toast.success('Project saved successfully.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setFormError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  // Cover image change (upload, replace, or remove)
  const handleCoverChange = async (newUrl: string | null) => {
    // When removing or replacing, delete old cover from storage
    if (project.cover_url && project.cover_url !== newUrl && project.id) {
      try {
        await deleteProjectCover(project.id, project.cover_url)
      } catch (err) {
        console.warn('Could not remove previous cover image from storage:', err)
      }
    }

    setProject((prev) => ({ ...prev, cover_url: newUrl }))

    // If persisted row exists, update row in database immediately
    if (project.id) {
      const { data, error } = await supabase
        .from('projects')
        .update({ cover_url: newUrl })
        .eq('id', project.id)
        .select()

      if (error) {
        toast.error(`Failed to update cover URL: ${error.message}`)
      } else if (!data || data.length === 0) {
        toast.error('Failed to update cover URL: No row was updated.')
      } else if (!newUrl) {
        toast.info('Cover image removed from storage.')
      } else {
        toast.success('Cover image updated.')
      }
    }
  }

  // Document uploaded handler
  const handleDocumentUploaded = async (newFile: ProjectFile) => {
    const nextFiles = [...(project.files || []), newFile]
    setProject((prev) => ({ ...prev, files: nextFiles }))

    if (project.id) {
      const { data, error } = await supabase
        .from('projects')
        .update({ files: nextFiles })
        .eq('id', project.id)
        .select()

      if (error) {
        toast.error(`Failed to update files in database: ${error.message}`)
      } else if (!data || data.length === 0) {
        toast.error('Failed to update files in database: No row was updated.')
      } else {
        toast.success(`Attached "${newFile.name}".`)
      }
    }
  }

  // Document remove handler (deletes from storage and updates files column)
  const handleRemoveDocument = async (fileToRemove: ProjectFile) => {
    try {
      await deleteProjectDocument(fileToRemove)
      const nextFiles = (project.files || []).filter((f) => f.path !== fileToRemove.path)
      setProject((prev) => ({ ...prev, files: nextFiles }))

      if (project.id) {
        const { data, error } = await supabase
          .from('projects')
          .update({ files: nextFiles })
          .eq('id', project.id)
          .select()

        if (error) throw error
        if (!data || data.length === 0) {
          throw new Error('No row was updated. Check your permissions and try again.')
        }
      }
      toast.success(`Removed "${fileToRemove.name}" from storage.`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Failed to remove document: ${msg}`)
    }
  }

  // Delete project from editor
  const handleDeleteProject = async () => {
    if (!project.id) return
    try {
      await deleteProjectStorage(project.id, project.files, project.cover_url)
      const { data, error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id)
        .select()

      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('No row was deleted. Check your permissions and try again.')
      }

      toast.success('Project deleted.')
      navigate('/projects')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Failed to delete project: ${msg}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="size-8 text-accent animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="card p-8 border-line text-center space-y-4">
        <FolderKanban className="size-12 text-muted mx-auto" />
        <h2 className="text-xl font-bold text-ink">Project Not Found</h2>
        <p className="text-xs text-muted max-w-md mx-auto">
          The requested project does not exist or may have been deleted.
        </p>
        <Link to="/projects" className="btn-primary inline-flex items-center gap-2 text-xs">
          <ArrowLeft className="size-3.5" />
          <span>Back to Projects</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Top Navigation & Action Header */}
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted hover:text-ink mb-3 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Projects</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <PageHeader
            eyebrow="Project Editor"
            title={isNew ? 'New Project' : project.title || 'Edit Project'}
            description={
              isNew
                ? 'Fill in project details. Saving creates the row and immediately unlocks media and document uploads.'
                : 'Update technical details, highlights, cover image, and document attachments.'
            }
          />

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {!isNew && (
              <ConfirmButton
                onConfirm={handleDeleteProject}
                confirmText="Delete this project and all files?"
                confirmButtonText="Yes, delete"
              />
            )}
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="btn-primary flex items-center gap-2 text-xs py-2 px-4"
            >
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              <span>{saving ? 'Saving...' : isNew ? 'Create Project' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* SECTION 1: OVERVIEW & CORE INFO */}
        <section className="card p-6 border-line space-y-6">
          <div>
            <p className="eyebrow mb-1">Core Information</p>
            <h2 className="text-lg font-bold text-ink">Project Details</h2>
            <p className="text-xs text-muted mt-0.5">
              Identities, headings, and high-level summaries displayed across your portfolio cards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <Field
                label="Kicker / Category"
                value={project.kicker || ''}
                onChange={(e) => setProject({ ...project, kicker: e.target.value })}
                placeholder="e.g. Full Stack Application"
                hint="Category eyebrow above title"
              />
            </div>
            <div className="md:col-span-2">
              <Field
                label="Title"
                required
                value={project.title || ''}
                onChange={(e) => setProject({ ...project, title: e.target.value })}
                placeholder="e.g. Antigravity Cloud Platform"
              />
            </div>
          </div>

          <Field
            label="Tagline"
            value={project.tagline || ''}
            onChange={(e) => setProject({ ...project, tagline: e.target.value })}
            placeholder="e.g. High-performance distributed workflow orchestrator built with Rust & Go"
            hint="One-line punchy subtitle"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextArea
              label="Summary"
              value={project.summary || ''}
              onChange={(e) => setProject({ ...project, summary: e.target.value })}
              rows={4}
              placeholder="Comprehensive overview of the problem, solution, and architectural design..."
            />
            <TextArea
              label="Outcome / Results"
              value={project.outcome || ''}
              onChange={(e) => setProject({ ...project, outcome: e.target.value })}
              rows={4}
              placeholder="Key measurable results, performance gains, scaling milestones, or business impact..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-line p-4 bg-bg/40">
            <Toggle
              label="Featured Project"
              description="Highlight this project prominently on the portfolio homepage"
              checked={project.featured ?? false}
              onChange={(checked) => setProject({ ...project, featured: checked })}
            />
            <Toggle
              label="Visible on Website"
              description="Control public visibility on the portfolio site"
              checked={project.visible ?? true}
              onChange={(checked) => setProject({ ...project, visible: checked })}
            />
          </div>
        </section>

        {/* SECTION 2: LINKS & TECHNOLOGIES */}
        <section className="card p-6 border-line space-y-6">
          <div>
            <p className="eyebrow mb-1">Stack & Links</p>
            <h2 className="text-lg font-bold text-ink">External Links & Technologies</h2>
            <p className="text-xs text-muted mt-0.5">
              Source code repositories, live production URLs, and technical stack badges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="GitHub Repository URL"
              value={project.github_url || ''}
              onChange={(e) => setProject({ ...project, github_url: e.target.value })}
              placeholder="https://github.com/username/project"
              hint="Must start with http:// or https://"
            />
            <Field
              label="Live Website / Demo URL"
              value={project.live_url || ''}
              onChange={(e) => setProject({ ...project, live_url: e.target.value })}
              placeholder="https://myproject.com"
              hint="Must start with http:// or https://"
            />
          </div>

          <div>
            <TagInput
              label="Technologies & Tools"
              value={project.tech || []}
              onChange={(tech) => setProject({ ...project, tech })}
              placeholder="Type technology name and press Enter (e.g. TypeScript, React, PostgreSQL)..."
              hint="Press Enter or comma to add each technology badge."
            />
          </div>
        </section>

        {/* SECTION 3: HIGHLIGHT BULLETS */}
        <section className="card p-6 border-line space-y-6">
          <div>
            <p className="eyebrow mb-1">Accomplishments</p>
            <h2 className="text-lg font-bold text-ink">Key Highlights / Bullets</h2>
            <p className="text-xs text-muted mt-0.5">
              Specific accomplishments, technical feats, or responsibilities for this project.
            </p>
          </div>

          <ListEditor
            label="Bullet Points"
            items={project.bullets || []}
            onChange={(bullets) => setProject({ ...project, bullets })}
            placeholder="e.g. Engineered real-time WebSocket protocol supporting 100k concurrent connections..."
            hint="Use the arrows to reorder bullet points. Empty rows can be removed with the trash icon."
          />
        </section>

        {/* SECTION 4: MEDIA & COVER IMAGE */}
        <section className="card p-6 border-line space-y-6">
          <div>
            <p className="eyebrow mb-1">Visual Asset</p>
            <h2 className="text-lg font-bold text-ink">Cover Image</h2>
            <p className="text-xs text-muted mt-0.5">
              Primary visual preview image stored in the <code className="font-mono text-accent">portfolio</code> storage bucket.
            </p>
          </div>

          {isNew ? (
            <div className="border border-dashed border-line bg-surface/40 p-8 text-center flex flex-col items-center justify-center space-y-2">
              <div className="p-3 border border-line bg-bg text-muted">
                <Lock className="size-5 text-muted" />
              </div>
              <p className="text-sm font-semibold text-ink">Cover image upload locked</p>
              <p className="text-xs text-muted max-w-md">
                Insert and save this project first to generate its unique ID (<code className="font-mono text-accent">projects/&lt;id&gt;/</code>). Cover uploads will be unlocked immediately once saved.
              </p>
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="btn-primary text-xs py-1.5 px-3 mt-2"
              >
                {saving ? 'Creating...' : 'Save & Unlock Uploads'}
              </button>
            </div>
          ) : (
            <ImageUpload
              bucket="portfolio"
              folder={`projects/${project.id}`}
              value={project.cover_url}
              onChange={handleCoverChange}
              label="Cover Image"
              hint="PNG, JPG, WEBP, or AVIF up to 10 MB. Removing or replacing deletes the previous file from storage."
              disabled={saving}
            />
          )}
        </section>

        {/* SECTION 5: PROJECT DOCUMENTS */}
        <section className="card p-6 border-line space-y-6">
          <div>
            <p className="eyebrow mb-1">Downloads & Attachments</p>
            <h2 className="text-lg font-bold text-ink">Project Documents</h2>
            <p className="text-xs text-muted mt-0.5">
              Specifications, architecture diagrams, slides, or whitepapers stored in the <code className="font-mono text-accent">project-documents</code> bucket (<code className="font-mono text-accent">&lt;id&gt;/&lt;safeName&gt;</code>).
            </p>
          </div>

          {isNew ? (
            <div className="border border-dashed border-line bg-surface/40 p-8 text-center flex flex-col items-center justify-center space-y-2">
              <div className="p-3 border border-line bg-bg text-muted">
                <Lock className="size-5 text-muted" />
              </div>
              <p className="text-sm font-semibold text-ink">Document upload locked</p>
              <p className="text-xs text-muted max-w-md">
                Insert and save this project first to generate its unique folder path in the <code className="font-mono text-accent">project-documents</code> bucket.
              </p>
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="btn-primary text-xs py-1.5 px-3 mt-2"
              >
                {saving ? 'Creating...' : 'Save & Unlock Uploads'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <FileUpload
                bucket="project-documents"
                folder={project.id}
                onUploaded={handleDocumentUploaded}
                label="Attach Document"
                hint="Upload PDF, DOCX, PPTX, XLSX, or images up to 20 MB. Uploaded files are immediately available."
                disabled={saving}
              />

              {project.files && project.files.length > 0 ? (
                <div className="space-y-2 pt-2">
                  <p className="font-mono text-xs uppercase tracking-wider text-muted mb-2">
                    Attached Files ({project.files.length})
                  </p>
                  {project.files.map((file) => (
                    <FileListItem
                      key={file.path || file.url}
                      file={file}
                      onRemove={() => handleRemoveDocument(file)}
                      disabled={saving}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted font-mono pt-1">
                  No documents attached to this project yet.
                </p>
              )}
            </div>
          )}
        </section>

        {/* INLINE ERROR DISPLAY */}
        {formError && (
          <div className="p-4 border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
            <p className="font-semibold mb-0.5">Please correct the following error:</p>
            <p>{formError}</p>
          </div>
        )}

        {/* BOTTOM SAVE BAR */}
        <div className="flex items-center justify-between pt-4 border-t border-line">
          <Link
            to="/projects"
            className="px-4 py-2 border border-line bg-surface text-xs font-mono uppercase tracking-wider text-muted hover:text-ink transition-colors"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2 text-xs py-2 px-5"
          >
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            <span>{saving ? 'Saving...' : isNew ? 'Create Project' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
