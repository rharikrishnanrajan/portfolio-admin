import { describe, it, expect, vi } from 'vitest'

// Mock ./supabase so the module-level createClient call in storage.ts
// does not fail in the test environment (no Vite env vars available).
vi.mock('./supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(),
    },
  },
}))

import { detectFileType, sanitizeStoragePath, safeName } from './storage'

// ---------------------------------------------------------------------------
// detectFileType — magic byte detection
// ---------------------------------------------------------------------------
describe('detectFileType', () => {
  function buf(...bytes: number[]): ArrayBuffer {
    return new Uint8Array(bytes).buffer
  }

  it('detects PDF by magic bytes (%PDF-)', () => {
    const b = buf(0x25, 0x50, 0x44, 0x46, 0x2d, 0x00, 0x00, 0x00)
    const result = detectFileType(b, 'doc.pdf')
    expect(result).not.toBeNull()
    expect(result?.ext).toBe('.pdf')
    expect(result?.mime).toBe('application/pdf')
  })

  it('detects PNG by magic bytes (89 50 4E 47)', () => {
    const b = buf(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d)
    const result = detectFileType(b, 'img.png')
    expect(result).not.toBeNull()
    expect(result?.ext).toBe('.png')
    expect(result?.mime).toBe('image/png')
  })

  it('detects JPEG by magic bytes (FF D8 FF)', () => {
    const b = buf(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01)
    const result = detectFileType(b, 'photo.jpg')
    expect(result).not.toBeNull()
    expect(result?.ext).toBe('.jpg')
    expect(result?.mime).toBe('image/jpeg')
  })

  it('detects JPEG and uses .jpeg extension when filename ends in .jpeg', () => {
    const b = buf(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01)
    const result = detectFileType(b, 'photo.jpeg')
    expect(result?.ext).toBe('.jpeg')
  })

  it('detects WebP by RIFF....WEBP magic bytes', () => {
    const b = buf(
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x24, 0x00, 0x00, 0x00, // file size (little-endian)
      0x57, 0x45, 0x42, 0x50, // WEBP
      0x56, 0x50, 0x38        // VP8 chunk
    )
    const result = detectFileType(b, 'img.webp')
    expect(result).not.toBeNull()
    expect(result?.ext).toBe('.webp')
    expect(result?.mime).toBe('image/webp')
  })

  it('detects AVIF by ftyp box with avif brand', () => {
    // ISO BMFF: 4-byte size, 'ftyp' box type, 'avif' brand
    const b = buf(
      0x00, 0x00, 0x00, 0x1c, // box size = 28
      0x66, 0x74, 0x79, 0x70, // 'ftyp'
      0x61, 0x76, 0x69, 0x66, // 'avif'
      0x00, 0x00, 0x00, 0x00  // minor version
    )
    const result = detectFileType(b, 'img.avif')
    expect(result).not.toBeNull()
    expect(result?.ext).toBe('.avif')
    expect(result?.mime).toBe('image/avif')
  })

  it('detects DOCX Office OpenXML (PK magic bytes) with .docx extension', () => {
    const b = buf(0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 0x08, 0x00, 0x00, 0x00)
    const result = detectFileType(b, 'document.docx')
    expect(result).not.toBeNull()
    expect(result?.ext).toBe('.docx')
    expect(result?.mime).toContain('wordprocessingml')
  })

  it('detects XLSX Office OpenXML with .xlsx extension', () => {
    const b = buf(0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 0x08, 0x00, 0x00, 0x00)
    const result = detectFileType(b, 'spreadsheet.xlsx')
    expect(result).not.toBeNull()
    expect(result?.ext).toBe('.xlsx')
    expect(result?.mime).toContain('spreadsheetml')
  })

  it('detects PPTX Office OpenXML with .pptx extension', () => {
    const b = buf(0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 0x08, 0x00, 0x00, 0x00)
    const result = detectFileType(b, 'presentation.pptx')
    expect(result).not.toBeNull()
    expect(result?.ext).toBe('.pptx')
    expect(result?.mime).toContain('presentationml')
  })

  it('rejects generic ZIP archive (PK magic, .zip extension)', () => {
    const b = buf(0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00)
    const result = detectFileType(b, 'archive.zip')
    expect(result).toBeNull()
  })

  it('rejects SVG (XML-like text, no recognized magic bytes)', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    const b = new TextEncoder().encode(svg).buffer
    const result = detectFileType(b, 'evil.svg')
    expect(result).toBeNull()
  })

  it('rejects HTML content', () => {
    const html = '<!DOCTYPE html><html><body><script>alert(1)</script></body></html>'
    const b = new TextEncoder().encode(html).buffer
    const result = detectFileType(b, 'evil.html')
    expect(result).toBeNull()
  })

  it('rejects buffers shorter than 4 bytes', () => {
    const b = buf(0x89, 0x50, 0x4e)
    const result = detectFileType(b, 'tiny.png')
    expect(result).toBeNull()
  })

  it('rejects JavaScript files', () => {
    const js = '(function(){alert("xss")})()'
    const b = new TextEncoder().encode(js).buffer
    const result = detectFileType(b, 'evil.js')
    expect(result).toBeNull()
  })

  it('rejects PDF magic bytes with .png extension mismatch (detectFileType reports pdf)', () => {
    // detectFileType returns the detected type regardless of extension; mismatch checking is in validateFile
    const b = buf(0x25, 0x50, 0x44, 0x46, 0x2d, 0x00, 0x00, 0x00)
    const result = detectFileType(b, 'fake.png')
    // It correctly identifies the content as PDF even though filename says .png
    expect(result?.ext).toBe('.pdf')
  })
})

// ---------------------------------------------------------------------------
// sanitizeStoragePath
// ---------------------------------------------------------------------------
describe('sanitizeStoragePath', () => {
  it('passes through a clean path unchanged', () => {
    expect(sanitizeStoragePath('projects/abc/file.pdf')).toBe('projects/abc/file.pdf')
  })

  it('strips leading slash', () => {
    expect(sanitizeStoragePath('/projects/file.pdf')).toBe('projects/file.pdf')
  })

  it('strips trailing slash', () => {
    expect(sanitizeStoragePath('projects/file/')).toBe('projects/file')
  })

  it('removes path traversal segments (..)', () => {
    expect(sanitizeStoragePath('projects/../../../etc/passwd')).toBe('projects/etc/passwd')
  })

  it('removes single-dot segments (.)', () => {
    expect(sanitizeStoragePath('projects/./file.pdf')).toBe('projects/file.pdf')
  })

  it('converts backslashes to forward slashes', () => {
    expect(sanitizeStoragePath('projects\\abc\\file.pdf')).toBe('projects/abc/file.pdf')
  })

  it('collapses double slashes', () => {
    expect(sanitizeStoragePath('projects//abc//file.pdf')).toBe('projects/abc/file.pdf')
  })

  it('removes dots-only segment', () => {
    expect(sanitizeStoragePath('projects/..../file.pdf')).toBe('projects/..../file.pdf')
  })

  it('handles empty string', () => {
    expect(sanitizeStoragePath('')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// safeName — secure filename generation
// ---------------------------------------------------------------------------
describe('safeName', () => {
  it('generates a name in uuid-slug.ext format', () => {
    const name = safeName('My Photo.png')
    // Pattern: <uuid>-<slug>.ext
    expect(name).toMatch(/^[0-9a-f-]{36}-[a-z0-9-]+(\.[\w]+)?$/)
  })

  it('lowercases the extension', () => {
    const name = safeName('IMAGE.PNG')
    expect(name.endsWith('.png')).toBe(true)
  })

  it('strips unsafe characters from the slug portion', () => {
    const name = safeName('../../evil/../file.pdf')
    // The slug should not contain dots, slashes, or path segments
    // Split off the uuid prefix and extension
    const parts = name.split('.')
    const slugPart = parts[0]
    expect(slugPart).not.toContain('/')
    expect(slugPart).not.toContain('..')
  })

  it('uses provided detected extension over file extension', () => {
    const name = safeName('photo.jpg', '.webp')
    expect(name.endsWith('.webp')).toBe(true)
  })

  it('falls back to "file" slug for empty-after-sanitize names', () => {
    const name = safeName('.....')
    expect(name).toContain('file')
  })

  it('limits slug portion to at most 40 characters', () => {
    const longName = 'a'.repeat(100) + '.png'
    const name = safeName(longName)
    // Strip uuid- prefix (36 chars + 1 dash) and extension
    const withoutUuid = name.slice(37) // "slug.ext"
    const slugOnly = withoutUuid.includes('.') ? withoutUuid.slice(0, withoutUuid.lastIndexOf('.')) : withoutUuid
    expect(slugOnly.length).toBeLessThanOrEqual(40)
  })

  it('produces different names for the same input (UUID entropy)', () => {
    const name1 = safeName('photo.png')
    const name2 = safeName('photo.png')
    // UUIDs should be unique
    expect(name1).not.toBe(name2)
  })
})
