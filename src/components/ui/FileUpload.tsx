import { useRef, useState, type ChangeEvent } from 'react'
import { AlertCircle, ExternalLink, FileText, Loader2, Upload, X } from 'lucide-react'
import { safeName, uploadFile } from '../../lib/storage'
import { safeUrl } from '../../lib/safeUrl'
import type { ProjectFile } from '../../types/rows'

export interface FileUploadProps {
  bucket?: string
  folder?: string
  onUploaded: (file: ProjectFile) => void
  label?: string
  disabled?: boolean
  hint?: string
  accept?: string
}

export function FileUpload({
  bucket = 'project-documents',
  folder = 'documents',
  onUploaded,
  label,
  disabled = false,
  hint,
  accept = '.pdf,.png,.jpg,.jpeg,.webp,.avif,.docx,.pptx,.xlsx',
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setUploading(true)

    try {
      const cleanFolder = folder.replace(/^\/+|\/+$/g, '')
      const fileName = safeName(file.name)
      const path = cleanFolder ? `${cleanFolder}/${fileName}` : fileName

      const { url, path: uploadedPath } = await uploadFile(bucket, path, file)

      onUploaded({
        name: file.name,
        url,
        path: uploadedPath,
        type: file.type || file.name.slice(file.name.lastIndexOf('.')),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block font-mono text-xs uppercase tracking-wider text-muted mb-1.5">
          {label}
        </label>
      )}

      <div
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        className={`border border-dashed border-line bg-surface/50 hover:bg-surface hover:border-accent/50 transition-colors p-4 text-center flex flex-col items-center justify-center cursor-pointer ${
          disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {uploading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="size-4 text-accent animate-spin" />
            <span className="text-xs text-muted font-mono uppercase tracking-wider">
              Uploading document...
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-ink font-medium">
            <Upload className="size-4 text-accent" />
            <span>Click to upload file</span>
            <span className="text-xs text-muted font-normal">
              (PDF, DOCX, PPTX, XLSX, images up to 20 MB)
            </span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled || uploading}
        className="hidden"
      />

      {error && (
        <div className="mt-2 text-xs text-rose-400 flex items-center gap-1.5">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {!error && hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

/**
 * Helper component to render an uploaded document file with view & remove buttons.
 */
export function FileListItem({
  file,
  onRemove,
  disabled = false,
}: {
  file: ProjectFile
  onRemove: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-2.5 bg-surface border border-line text-sm">
      <div className="flex items-center gap-2.5 min-w-0">
        <FileText className="size-4 text-accent shrink-0" />
        <span className="truncate text-ink font-mono text-xs">{file.name}</span>
        {file.type && (
          <span className="text-[0.65rem] uppercase font-mono px-1 py-0.5 border border-line text-muted shrink-0">
            {file.type.replace(/^.*\//, '').replace(/^\./, '')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {safeUrl(file.url) ? (
          <a
            href={safeUrl(file.url)!}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-ink transition-colors p-1"
            title="Open in new tab"
          >
            <ExternalLink className="size-3.5" />
          </a>
        ) : (
          <span className="text-muted/40 p-1" title="Unsafe or invalid URL">
            <ExternalLink className="size-3.5" />
          </span>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="text-muted hover:text-rose-400 transition-colors p-1 disabled:opacity-40"
          title="Remove file"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
