/**
 * Validates URLs. When filled, URLs must start with http:// or https://.
 * Empty or whitespace-only values are considered valid (optional fields).
 */
export function isValidUrl(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return true
  const trimmed = url.trim()
  return /^https?:\/\/.+/i.test(trimmed)
}

/**
 * Validates an email address.
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || !email.trim()) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

/**
 * Converts empty or whitespace-only strings to null.
 * Use for every nullable text/url/date column before saving to prevent "" in DB.
 */
export function emptyToNull(value: string | null | undefined): string | null {
  if (!value || !value.trim()) return null
  return value.trim()
}
