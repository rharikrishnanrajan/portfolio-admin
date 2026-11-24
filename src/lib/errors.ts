/**
 * Centralized error mapping utility.
 *
 * Maps Supabase / PostgREST errors, PostgreSQL error codes, and HTTP statuses
 * into safe, human-friendly messages without exposing database internals,
 * constraint names, or sensitive schema details.
 */

export function friendlyErrorMessage(err: unknown): string {
  if (!err) return 'An unexpected error occurred. Please try again.'

  const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : String(err)
  const code = (err as { code?: string })?.code || ''
  const status =
    (err as { status?: number })?.status ||
    (err as { statusCode?: number })?.statusCode

  // 1. PostgreSQL Error Codes (e.g., 23505 unique violation)
  if (code === '23505' || msg.includes('duplicate key') || msg.includes('already exists')) {
    if (msg.includes('slug')) {
      return 'An item with this slug already exists. Please choose a different unique slug.'
    }
    return 'An item with this identifier already exists.'
  }

  // PostgreSQL Check Constraint Violations (23514)
  if (code === '23514' || msg.includes('chk_')) {
    if (msg.includes('chk_messages_email')) {
      return 'Please provide a valid email address.'
    }
    if (
      msg.includes('chk_projects_urls') ||
      msg.includes('chk_cert_url') ||
      msg.includes('chk_pub_url') ||
      msg.includes('chk_profile_urls')
    ) {
      return 'Invalid URL scheme. Only HTTP and HTTPS URLs are permitted.'
    }
    if (msg.includes('chk_social_url')) {
      return 'Invalid URL format. Allowed formats: HTTP, HTTPS, mailto, or tel.'
    }
    if (
      msg.includes('chk_sections_limits') ||
      msg.includes('chk_projects_limits') ||
      msg.includes('chk_settings_limits') ||
      msg.includes('chk_cert_limits') ||
      msg.includes('chk_pub_limits')
    ) {
      return 'Content exceeds maximum allowed size or character length limit.'
    }
    return 'Input did not satisfy database validation requirements.'
  }

  // 2. HTTP Statuses & PostgREST / Supabase errors
  if (
    status === 401 ||
    msg.includes('JWT') ||
    msg.includes('token') ||
    msg.includes('session expired')
  ) {
    return 'Your session has expired. Please sign in again.'
  }

  if (
    status === 403 ||
    code === '42501' ||
    msg.includes('permission denied') ||
    msg.includes('row-level security')
  ) {
    return 'You do not have permission to perform this action.'
  }

  if (status === 404 || msg.includes('not found') || msg.includes('PGRST116')) {
    return 'The requested item could not be found.'
  }

  if (status === 409) {
    return 'This item already exists or conflicts with another record.'
  }

  if (
    status === 413 ||
    msg.includes('too large') ||
    msg.includes('payload too large') ||
    msg.includes('exceeds')
  ) {
    return 'The uploaded file or content is too large. Please reduce the size and try again.'
  }

  if (
    status === 429 ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('throttle')
  ) {
    return 'Too many requests right now. Please wait a moment and try again.'
  }

  if (
    (status && status >= 500 && status < 600) ||
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504')
  ) {
    return 'The service is temporarily unavailable. Please try again shortly.'
  }

  // 3. Network & Connection errors
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('Network request failed') ||
    msg.includes('aborted') ||
    msg.includes('AbortError')
  ) {
    return 'Network connection error or request timed out. Please check your connection and try again.'
  }

  // 4. Optimistic concurrency error
  if (msg.includes('changed elsewhere')) {
    return 'This item was changed elsewhere. Reload and try again.'
  }

  // 5. Preserved schema validation error messages (from schemas.ts)
  if (
    msg.includes('required') ||
    msg.includes('Must be') ||
    msg.includes('Invalid') ||
    msg.includes('Slug must')
  ) {
    return msg
  }

  return 'An error occurred while processing your request. Please try again.'
}
