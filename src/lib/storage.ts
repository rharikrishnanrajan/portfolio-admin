import { supabase } from './supabase'

export interface BucketRule {
  maxSize: number // in bytes
  allowedExtensions: string[]
  allowedMimeTypes: string[]
}

export const BUCKET_RULES: Record<string, BucketRule> = {
  portfolio: {
    maxSize: 10 * 1024 * 1024, // 10 MB
    allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.pdf'],
    allowedMimeTypes: [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/avif',
      'application/pdf',
    ],
  },
  'project-documents': {
    maxSize: 20 * 1024 * 1024, // 20 MB
    allowedExtensions: [
      '.pdf',
      '.png',
      '.jpg',
      '.jpeg',
      '.webp',
      '.avif',
      '.docx',
      '.pptx',
      '.xlsx',
    ],
    allowedMimeTypes: [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/avif',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
}

export interface DetectedType {
  ext: string
  mime: string
}

/**
 * Detects real file format by inspecting file magic bytes.
 * Only returns recognized and permitted formats. Rejects SVGs, HTML, JS, and raw archives.
 */
export function detectFileType(buffer: ArrayBuffer, fileName: string): DetectedType | null {
  const bytes = new Uint8Array(buffer)
  if (bytes.length < 4) return null

  // 1. PDF: %PDF- (0x25 0x50 0x44 0x46 0x2D)
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return { ext: '.pdf', mime: 'application/pdf' }
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { ext: '.png', mime: 'image/png' }
  }

  // 3. JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    const isJpeg = fileName && fileName.toLowerCase().endsWith('.jpeg')
    return { ext: isJpeg ? '.jpeg' : '.jpg', mime: 'image/jpeg' }
  }

  // 4. WebP: RIFF (52 49 46 46) .... WEBP (57 45 42 50)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { ext: '.webp', mime: 'image/webp' }
  }

  // 5. AVIF: ISO BMFF box with ftyp at bytes 4..7, and brand avif/avis
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    const brandStr = String.fromCharCode(
      ...bytes.slice(8, Math.min(bytes.length, 64))
    ).toLowerCase()
    if (brandStr.includes('avif') || brandStr.includes('avis')) {
      return { ext: '.avif', mime: 'image/avif' }
    }
  }

  // 6. Office OpenXML (DOCX, PPTX, XLSX): ZIP container (PK\x03\x04, PK\x05\x06, PK\x07\x08)
  if (
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)
  ) {
    const lower = (fileName || '').toLowerCase()
    if (lower.endsWith('.docx')) {
      return {
        ext: '.docx',
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }
    }
    if (lower.endsWith('.xlsx')) {
      return {
        ext: '.xlsx',
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    }
    if (lower.endsWith('.pptx')) {
      return {
        ext: '.pptx',
        mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      }
    }
    // Disallow generic .zip archives or non-office files with PK magic bytes
    return null
  }

  return null
}

/**
 * Strips path traversal characters (..), backslashes, leading/trailing slashes,
 * and empty or dots-only segments.
 */
export function sanitizeStoragePath(path: string): string {
  return path
    .replace(/\\/g, '/')
    .split('/')
    .map((seg) => seg.trim())
    .filter((seg) => seg.length > 0 && seg !== '.' && seg !== '..')
    .join('/')
}

/**
 * Generates storage name as <uuid>-<safe-slug>.<ext>
 * Never uses raw user filenames directly in paths.
 */
export function safeName(fileName: string, detectedExt?: string): string {
  const lastDot = fileName.lastIndexOf('.')
  const base = lastDot !== -1 ? fileName.slice(0, lastDot) : fileName
  const fileExt = lastDot !== -1 ? fileName.slice(lastDot).toLowerCase() : ''
  const ext = detectedExt ? (detectedExt.startsWith('.') ? detectedExt.toLowerCase() : `.${detectedExt.toLowerCase()}`) : fileExt

  const safeSlug = base
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'file'

  const uuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  return `${uuid}-${safeSlug}${ext}`
}

export interface ValidationResult {
  valid: boolean
  error?: string
  detected?: DetectedType
}

/**
 * Validates a file against bucket rules:
 * 1. Checks size limit BEFORE reading into memory.
 * 2. Reads only first 512 bytes to inspect magic bytes.
 * 3. Confirms detected type is allowed in the bucket and matches file extension.
 */
export async function validateFile(bucket: string, file: File): Promise<ValidationResult> {
  const rule = BUCKET_RULES[bucket]
  if (!rule) {
    return { valid: true }
  }

  // 1. Enforce size limit before reading file into memory
  const maxMB = Math.round(rule.maxSize / (1024 * 1024))
  if (file.size > rule.maxSize) {
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the ${maxMB} MB limit for the "${bucket}" bucket.`,
    }
  }

  // 2. Read first 512 bytes for magic bytes verification
  let headerBuffer: ArrayBuffer
  try {
    headerBuffer = await file.slice(0, 512).arrayBuffer()
  } catch {
    return {
      valid: false,
      error: 'Unable to read file contents for security verification.',
    }
  }

  const detected = detectFileType(headerBuffer, file.name)
  if (!detected) {
    const readableList = rule.allowedExtensions.map((e) => e.replace('.', '').toUpperCase()).join(', ')
    return {
      valid: false,
      error: `Unsupported or invalid file content. Allowed formats for "${bucket}": ${readableList}. SVG, HTML, and archives are prohibited.`,
    }
  }

  // 3. Confirm detected format is permitted in this bucket
  if (!rule.allowedExtensions.includes(detected.ext) || !rule.allowedMimeTypes.includes(detected.mime)) {
    return {
      valid: false,
      error: `File format "${detected.ext.toUpperCase()}" is not permitted in bucket "${bucket}".`,
    }
  }

  // 4. Verify filename extension matches the detected type
  const lastDot = file.name.lastIndexOf('.')
  const claimedExt = lastDot !== -1 ? file.name.slice(lastDot).toLowerCase() : ''

  const isJpegMatch = (claimedExt === '.jpg' || claimedExt === '.jpeg') && (detected.ext === '.jpg' || detected.ext === '.jpeg')
  if (claimedExt !== detected.ext && !isJpegMatch) {
    return {
      valid: false,
      error: `File extension "${claimedExt}" does not match detected content type "${detected.ext}".`,
    }
  }

  return { valid: true, detected }
}

/**
 * Uploads a file to Supabase storage.
 * Enforces magic-byte verification, sanitized paths, and sets contentType strictly from detected type.
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<{ url: string; path: string }> {
  const validation = await validateFile(bucket, file)
  if (!validation.valid || !validation.detected) {
    throw new Error(validation.error || 'Invalid file')
  }

  const cleanPath = sanitizeStoragePath(path)
  const { data, error } = await supabase.storage.from(bucket).upload(cleanPath, file, {
    contentType: validation.detected.mime,
    upsert: false,
  })

  if (error) {
    throw error
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
  return {
    url: urlData.publicUrl,
    path: data.path,
  }
}

/**
 * Remove a single file from Supabase storage.
 */
export async function removeFile(bucket: string, path: string): Promise<void> {
  const cleanPath = sanitizeStoragePath(path)
  const { error } = await supabase.storage.from(bucket).remove([cleanPath])
  if (error) {
    throw error
  }
}

/**
 * Remove multiple files from Supabase storage.
 */
export async function removeFiles(bucket: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const cleanPaths = paths.map(sanitizeStoragePath).filter(Boolean)
  if (cleanPaths.length === 0) return
  const { error } = await supabase.storage.from(bucket).remove(cleanPaths)
  if (error) {
    throw error
  }
}

/**
 * Extract storage path from a Supabase public URL.
 * e.g. "https://<host>/storage/v1/object/public/<bucket>/<path>" -> "<path>"
 */
export function extractStoragePath(bucket: string, url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const marker = `/storage/v1/object/public/${bucket}/`
    const idx = url.indexOf(marker)
    if (idx !== -1) {
      const rawPath = url.slice(idx + marker.length).split('?')[0]
      return sanitizeStoragePath(decodeURIComponent(rawPath))
    }
  } catch {
    // Ignore error
  }
  return null
}
