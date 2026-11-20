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
