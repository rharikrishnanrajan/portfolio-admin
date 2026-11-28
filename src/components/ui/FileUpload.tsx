import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { AlertCircle, ExternalLink, FileText, Loader2, Upload, X } from 'lucide-react'
import { safeName, uploadFile, removeFile, sanitizeStoragePath } from '../../lib/storage'
import { safeUrl } from '../../lib/safeUrl'
import type { ProjectFile } from '../../types/rows'

export interface FileUploadProps {
  bucket?: string
  folder?: string
  onUploaded: (file: ProjectFile) => Promise<void> | void
  label?: string
  disabled?: boolean
  hint?: string
  accept?: string
  icon?: ReactNode
  buttonText?: string
  fileHint?: string
}

export function FileUpload({
  bucket = 'project-documents',
  folder = 'documents',
  onUploaded,
  label,
  disabled = false,
  hint,
  accept = '.pdf,.png,.jpg,.jpeg,.webp,.avif,.docx,.pptx,.xlsx',
  icon,
  buttonText = 'Click to upload file',
  fileHint = '(PDF, DOCX, PPTX, XLSX, images up to 20 MB)',
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setUploading(true)
    let uploadedPath: string | null = null

    try {
      const cleanFolder = sanitizeStoragePath(folder)
      const fileName = safeName(file.name)
      const path = cleanFolder ? `${cleanFolder}/${fileName}` : fileName

      // 1) Upload the new file
      const { url, path: returnedPath } = await uploadFile(bucket, path, file)
      uploadedPath = returnedPath

      // 2) Save the row via onUploaded (and confirm a row was returned)
      try {
        await onUploaded({
          name: file.name,
          url,
          path: returnedPath,
          type: file.type || file.name.slice(file.name.lastIndexOf('.')),
        })
      } catch (err) {
        // If step 2 fails, delete the NEW file instead so it is not orphaned, and keep the old one.
        if (uploadedPath) {
          try {
            await removeFile(bucket, uploadedPath)
          } catch (cleanupErr) {
            console.warn('Could not clean up newly uploaded file after save failure:', cleanupErr)
          }
        }
        throw err
      }
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

      <button
        type="button"
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        disabled={disabled || uploading}
        className={`w-full border border-dashed border-line bg-surface/50 hover:bg-surface hover:border-accent/50 transition-colors p-4 text-center flex flex-col items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {uploading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="size-4 text-accent animate-spin" />
            <span className="text-xs text-muted font-mono uppercase tracking-wider">
              Uploading document...
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-ink font-medium flex-wrap justify-center">
            {icon ?? <Upload className="size-4 text-accent" />}
            <span>{buttonText}</span>
            {fileHint && (
              <span className="text-xs text-muted font-normal">
                {fileHint}
              </span>
            )}
          </div>
        )}
      </button>

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
