import { useRef, useState, type ChangeEvent } from 'react'
import { AlertCircle, Image as ImageIcon, Loader2, Upload, X } from 'lucide-react'
import { safeName, uploadFile, removeFile, extractStoragePath, sanitizeStoragePath } from '../../lib/storage'
import { safeImageUrl } from '../../lib/safeUrl'

export interface ImageUploadProps {
  bucket?: string
  folder?: string
  value?: string | null
  onChange: (url: string | null) => void
  label?: string
  disabled?: boolean
  hint?: string
  accept?: string
}

export function ImageUpload({
  bucket = 'portfolio',
  folder = 'images',
  value,
  onChange,
  label,
  disabled = false,
  hint,
  accept = 'image/png,image/jpeg,image/webp,image/avif',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    const isImage = file.type.startsWith('image/') && file.type !== 'image/svg+xml'
    const allowedExts = ['.png', '.jpg', '.jpeg', '.webp', '.avif']
    const hasImageExt = allowedExts.some((ext) => file.name.toLowerCase().endsWith(ext))

    if (!isImage && !hasImageExt) {
      setError('Please select an image file (PNG, JPG, WEBP, or AVIF).')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setUploading(true)

    try {
      const cleanFolder = sanitizeStoragePath(folder)
      const fileName = safeName(file.name)
      const path = cleanFolder ? `${cleanFolder}/${fileName}` : fileName

      const { url } = await uploadFile(bucket, path, file)

      // Purge previous image to prevent orphaned storage objects
      if (value && value !== url) {
        const oldPath = extractStoragePath(bucket, value)
        if (oldPath) {
          try {
            await removeFile(bucket, oldPath)
          } catch (err) {
            console.warn('Could not remove previous image from storage:', err)
          }
        }
      }

      onChange(url)
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

  const handleRemove = async () => {
    if (disabled || uploading) return
    if (value) {
      const oldPath = extractStoragePath(bucket, value)
      if (oldPath) {
        try {
          await removeFile(bucket, oldPath)
        } catch (err) {
          console.warn('Could not remove image from storage:', err)
        }
      }
    }
    onChange(null)
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block font-mono text-xs uppercase tracking-wider text-muted mb-1.5">
          {label}
        </label>
      )}

      {value ? (
        <div className="relative group border border-line bg-surface p-2 max-w-sm">
          <div className="aspect-video w-full overflow-hidden bg-bg/50 flex items-center justify-center">
            <img
              src={safeImageUrl(value) || ''}
              alt="Uploaded preview"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 pt-2 border-t border-line">
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-mono uppercase tracking-wider text-accent hover:underline disabled:opacity-50"
            >
              Replace image
            </button>
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={handleRemove}
              className="text-xs font-mono uppercase tracking-wider text-rose-400 hover:underline flex items-center gap-1 disabled:opacity-50"
            >
              <X className="size-3" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          className={`border border-dashed border-line bg-surface/50 hover:bg-surface hover:border-accent/50 transition-colors p-6 text-center flex flex-col items-center justify-center cursor-pointer ${
            disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-6 text-accent animate-spin" />
              <p className="text-xs text-muted font-mono uppercase tracking-wider">
                Uploading image...
              </p>
            </div>
          ) : (
            <>
              <div className="p-3 border border-line bg-bg mb-2">
                <ImageIcon className="size-5 text-muted" />
              </div>
              <p className="text-sm font-medium text-ink flex items-center gap-1.5">
                <Upload className="size-4 text-accent" />
                <span>Upload an image</span>
              </p>
              <p className="text-xs text-muted mt-1">
                PNG, JPG, WEBP, AVIF up to 10 MB
              </p>
            </>
          )}
        </div>
      )}

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
