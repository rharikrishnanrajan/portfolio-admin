import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FolderKanban,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Star,
} from 'lucide-react'
import { useCrud } from '../lib/useCrud'
import { PageHeader, ConfirmButton, EmptyState, useToast } from '../components/ui'
import { deleteProjectStorage } from '../lib/projectStorage'
import type { ProjectRow } from '../types/rows'

export default function Projects() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const {
    rows: projects,
    loading,
    error,
    remove,
    move,
    toggle,
  } = useCrud<ProjectRow>('projects', { orderBy: 'position', ascending: true })

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleToggleVisible = async (id: string) => {
    try {
      await toggle(id, 'visible')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Failed to update visibility: ${msg}`)
    }
  }

  const handleToggleFeatured = async (id: string) => {
    try {
      await toggle(id, 'featured')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Failed to update featured status: ${msg}`)
    }
  }

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    try {
      await move(id, direction)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Failed to reorder project: ${msg}`)
    }
  }

  const handleDelete = async (project: ProjectRow) => {
    setDeletingId(project.id)
    try {
      // 1. Delete associated files from storage buckets
      await deleteProjectStorage(project.id, project.files, project.cover_url)
      // 2. Remove row from database
      await remove(project.id)
      toast.success('Project and associated storage files deleted.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Failed to delete project: ${msg}`)
    } finally {
      setDeletingId(null)
    }
  }

  const visibleCount = projects.filter((p) => p.visible).length
  const featuredCount = projects.filter((p) => p.featured).length

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          eyebrow="Portfolio"
          title="Projects"
          description="Manage your showcase projects, technical highlights, live links, and document attachments."
        />
        <Link
          to="/projects/new"
          className="btn-primary flex items-center gap-2 text-xs py-2 px-3.5 self-start sm:self-auto shrink-0"
        >
          <Plus className="size-4" />
          <span>New Project</span>
        </Link>
      </div>

      {/* Summary stats pill bar */}
      {!loading && !error && projects.length > 0 && (
        <div className="flex items-center gap-4 text-xs font-mono text-muted border-b border-line pb-3">
          <span>
            Total: <strong className="text-ink">{projects.length}</strong>
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

      {/* Main Content Area */}
      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="size-8 text-accent animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm">
          <p className="font-semibold mb-1">Failed to load projects</p>
          <p className="text-xs">{error}</p>
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project showcase with cover image, tech stack, and documentation attachments."
          action={{
            label: 'Create First Project',
            onClick: () => navigate('/projects/new'),
          }}
        />
      ) : (
        <div className="space-y-3">
          {projects.map((project, index) => {
            const hasCover = Boolean(project.cover_url)
            const docCount = Array.isArray(project.files) ? project.files.length : 0
            const techList = Array.isArray(project.tech) ? project.tech : []

            return (
              <div
                key={project.id}
                className="card p-4 border-line flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-line/80 transition-colors"
              >
                {/* Left: Thumbnail and info */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {/* Cover thumbnail */}
                  <div className="w-24 h-16 bg-bg border border-line shrink-0 overflow-hidden flex items-center justify-center">
                    {hasCover ? (
                      <img
                        src={project.cover_url!}
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FolderKanban className="size-6 text-muted/40" />
                    )}
                  </div>

                  {/* Text details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {project.kicker && (
                        <span className="font-mono text-[0.65rem] uppercase tracking-wider text-accent font-semibold">
                          {project.kicker}
                        </span>
                      )}
                      {project.featured && (
                        <span className="inline-flex items-center gap-1 font-mono text-[0.65rem] uppercase px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400">
                          <Star className="size-2.5 fill-amber-400" />
                          Featured
                        </span>
                      )}
                      {!project.visible && (
                        <span className="font-mono text-[0.65rem] uppercase px-1.5 py-0.5 bg-bg border border-line text-muted">
                          Hidden
                        </span>
                      )}
                      {docCount > 0 && (
                        <span className="inline-flex items-center gap-1 font-mono text-[0.65rem] px-1.5 py-0.5 bg-bg border border-line text-muted">
                          <Paperclip className="size-2.5" />
                          {docCount} {docCount === 1 ? 'doc' : 'docs'}
                        </span>
                      )}
                    </div>

                    <Link
                      to={`/projects/${project.id}`}
                      className="text-base font-bold text-ink hover:text-accent transition-colors block truncate"
                    >
                      {project.title}
                    </Link>

                    {(project.tagline || project.summary) && (
                      <p className="text-xs text-muted truncate mt-0.5 max-w-xl">
                        {project.tagline || project.summary}
                      </p>
                    )}

                    {/* Tech stack tags */}
                    {techList.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-2">
                        {techList.slice(0, 4).map((tech) => (
                          <span
                            key={tech}
                            className="font-mono text-[0.65rem] px-1.5 py-0.5 bg-bg border border-line text-muted"
                          >
                            {tech}
                          </span>
                        ))}
                        {techList.length > 4 && (
                          <span className="font-mono text-[0.65rem] text-muted">
                            +{techList.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions and toggles */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-line w-full md:w-auto justify-end">
                  {/* External links preview if present */}
                  {project.live_url && (
                    <a
                      href={project.live_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 border border-line bg-bg text-muted hover:text-ink transition-colors"
                      title="Visit live site"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}

                  {/* Featured Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleFeatured(project.id)}
                    className={`px-2 py-1 font-mono text-[0.7rem] uppercase tracking-wider border transition-colors flex items-center gap-1 ${
                      project.featured
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                        : 'border-line bg-bg text-muted hover:text-ink'
                    }`}
                    title={project.featured ? 'Unmark as featured' : 'Mark as featured'}
                  >
                    <Star
                      className={`size-3 ${
                        project.featured ? 'fill-amber-400 text-amber-400' : 'text-muted'
                      }`}
                    />
                    <span>{project.featured ? 'Featured' : 'Feature'}</span>
                  </button>

                  {/* Visible Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleVisible(project.id)}
                    className={`px-2 py-1 font-mono text-[0.7rem] uppercase tracking-wider border transition-colors ${
                      project.visible
                        ? 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20'
                        : 'border-line bg-bg text-muted hover:text-ink'
                    }`}
                    title={project.visible ? 'Hide from public site' : 'Show on public site'}
                  >
                    {project.visible ? 'Visible' : 'Hidden'}
                  </button>

                  {/* Reorder Up/Down */}
                  <div className="flex items-center border border-line bg-bg">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(project.id, 'up')}
                      className="p-1.5 text-muted hover:text-ink disabled:opacity-20 transition-colors"
                      title="Move up"
                    >
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === projects.length - 1}
                      onClick={() => handleMove(project.id, 'down')}
                      className="p-1.5 text-muted hover:text-ink disabled:opacity-20 transition-colors border-l border-line"
                      title="Move down"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>

                  {/* Edit button */}
                  <Link
                    to={`/projects/${project.id}`}
                    className="p-1.5 border border-line bg-bg text-muted hover:text-ink transition-colors"
                    title="Edit project"
                  >
                    <Pencil className="size-3.5" />
                  </Link>

                  {/* Delete button with confirm */}
                  <ConfirmButton
                    onConfirm={() => handleDelete(project)}
                    confirmText="Delete project and files?"
                    confirmButtonText="Yes, delete"
                    disabled={deletingId === project.id}
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
