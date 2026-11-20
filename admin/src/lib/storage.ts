import { supabase } from './supabase'

export interface BucketRule {
  maxSize: number // in bytes
  allowedExtensions: string[]
  allowedMimeTypes: string[]
}

const BUCKET_RULES: Record<string, BucketRule> = {
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
      'application/msword',
      'application/vnd.ms-powerpoint',
      'application/vnd.ms-excel',
    ],
  },
}

/**
 * Generate safe filename: lowercase, spaces to hyphens, strip unsafe characters,
 * prefixed with timestamp so replaced files are not cached.
 */
export function safeName(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  const ext = lastDot !== -1 ? fileName.slice(lastDot).toLowerCase() : ''
  const base = lastDot !== -1 ? fileName.slice(0, lastDot) : fileName

  const cleanBase = base
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')

  const timestamp = Date.now()
  return `${timestamp}-${cleanBase || 'file'}${ext}`
}

/**
 * Validates a file against bucket rules (type and size).
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateFile(bucket: string, file: File): { valid: boolean; error?: string } {
  const rule = BUCKET_RULES[bucket]
  if (!rule) {
    return { valid: true }
  }

  const maxMB = Math.round(rule.maxSize / (1024 * 1024))
  if (file.size > rule.maxSize) {
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the ${maxMB} MB limit for the "${bucket}" bucket.`,
    }
  }

  const ext = file.name.includes('.')
    ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    : ''

  const mimeMatch = file.type ? rule.allowedMimeTypes.includes(file.type.toLowerCase()) : false
  const extMatch = ext ? rule.allowedExtensions.includes(ext) : false

  if (!mimeMatch && !extMatch) {
    const readableList = rule.allowedExtensions.map((e) => e.replace('.', '').toUpperCase()).join(', ')
    return {
      valid: false,
      error: `Unsupported file type. Allowed formats for "${bucket}": ${readableList}.`,
    }
  }

  return { valid: true }
}

/**
 * Upload a file to Supabase storage with upsert: false.
 * Validates file type and size before uploading.
 * Returns public URL and storage path.
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<{ url: string; path: string }> {
  const validation = validateFile(bucket, file)
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file')
  }

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
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
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) {
    throw error
  }
}

/**
 * Remove multiple files from Supabase storage.
 */
export async function removeFiles(bucket: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(bucket).remove(paths)
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
      return decodeURIComponent(rawPath)
    }
  } catch {
    // Ignore error
  }
  return null
}
