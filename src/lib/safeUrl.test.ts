import { describe, it, expect } from 'vitest'
import { safeUrl, safeImageUrl } from './safeUrl'

describe('safeUrl', () => {
  // --- Allowed schemes ---
  it('accepts https URLs', () => {
    expect(safeUrl('https://example.com')).toBe('https://example.com')
  })

  it('accepts http URLs', () => {
    expect(safeUrl('http://example.com/path')).toBe('http://example.com/path')
  })

  it('accepts mailto links', () => {
    expect(safeUrl('mailto:user@example.com')).toBe('mailto:user@example.com')
  })

  it('accepts tel links', () => {
    expect(safeUrl('tel:+1234567890')).toBe('tel:+1234567890')
  })

  it('trims surrounding whitespace and accepts URL', () => {
    expect(safeUrl('  https://example.com  ')).toBe('https://example.com')
  })

  // --- Rejected dangerous schemes ---
  it('rejects javascript: scheme', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull()
  })

  it('rejects javascript: with mixed case (JavaScript:)', () => {
    expect(safeUrl('JavaScript:alert(1)')).toBeNull()
  })

  it('rejects javascript: with leading whitespace trick', () => {
    expect(safeUrl(' javascript:alert(1)')).toBeNull()
  })

  it('rejects data: URLs', () => {
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
  })

  it('rejects data: with mixed case (Data:)', () => {
    expect(safeUrl('Data:text/html,test')).toBeNull()
  })

  it('rejects vbscript: scheme', () => {
    expect(safeUrl('vbscript:msgbox(1)')).toBeNull()
  })

  it('rejects vbscript: with mixed case (VBScript:)', () => {
    expect(safeUrl('VBScript:msgbox(1)')).toBeNull()
  })

  it('rejects URLs with embedded null byte control character', () => {
    expect(safeUrl('https://example.com/\x00evil')).toBeNull()
  })

  it('rejects URLs with embedded tab control character', () => {
    expect(safeUrl('javas\tcript:alert(1)')).toBeNull()
  })

  it('rejects URLs with embedded newline control character', () => {
    expect(safeUrl('javas\ncript:alert(1)')).toBeNull()
  })

  it('rejects URLs with embedded carriage return', () => {
    expect(safeUrl('javas\rcript:alert(1)')).toBeNull()
  })

  // --- Edge cases ---
  it('returns null for null input', () => {
    expect(safeUrl(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(safeUrl(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(safeUrl('')).toBeNull()
  })

  it('returns null for whitespace-only string', () => {
    expect(safeUrl('   ')).toBeNull()
  })

  it('returns null for relative URLs', () => {
    expect(safeUrl('/relative/path')).toBeNull()
  })

  it('returns null for http URL without hostname', () => {
    expect(safeUrl('http://')).toBeNull()
  })

  // --- allowMailtoTel: false ---
  it('rejects mailto when allowMailtoTel is false', () => {
    expect(safeUrl('mailto:user@example.com', { allowMailtoTel: false })).toBeNull()
  })

  it('rejects tel when allowMailtoTel is false', () => {
    expect(safeUrl('tel:+1234567890', { allowMailtoTel: false })).toBeNull()
  })

  it('still accepts https when allowMailtoTel is false', () => {
    expect(safeUrl('https://example.com', { allowMailtoTel: false })).toBe('https://example.com')
  })
})

describe('safeImageUrl', () => {
  it('accepts https image URLs', () => {
    expect(safeImageUrl('https://cdn.example.com/image.png')).toBe('https://cdn.example.com/image.png')
  })

  it('rejects mailto: (images only need http/https)', () => {
    expect(safeImageUrl('mailto:user@example.com')).toBeNull()
  })

  it('rejects javascript: scheme', () => {
    expect(safeImageUrl('javascript:alert(1)')).toBeNull()
  })

  it('rejects data: URLs', () => {
    expect(safeImageUrl('data:image/png;base64,abc')).toBeNull()
  })

  it('returns null for null', () => {
    expect(safeImageUrl(null)).toBeNull()
  })
})
