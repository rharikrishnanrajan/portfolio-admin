import { describe, it, expect } from 'vitest'
import { friendlyErrorMessage } from './errors'

describe('friendlyErrorMessage', () => {
  // --- PostgreSQL error codes ---
  it('maps 23505 unique violation to "already exists" message', () => {
    const msg = friendlyErrorMessage({ code: '23505', message: 'duplicate key value' })
    expect(msg).toContain('already exists')
    expect(msg).not.toContain('23505')
    expect(msg).not.toContain('duplicate key')
  })

  it('maps slug duplicate key to slug-specific message', () => {
    const msg = friendlyErrorMessage({
      code: '23505',
      message: 'duplicate key value violates unique constraint on slug',
    })
    expect(msg.toLowerCase()).toContain('slug')
  })

  it('maps 23514 check constraint to safe message', () => {
    const msg = friendlyErrorMessage({
      code: '23514',
      message: 'new row violates check constraint "chk_projects_urls"',
    })
    expect(msg).not.toContain('chk_projects_urls')
    expect(msg).not.toContain('constraint')
    expect(msg.length).toBeGreaterThan(0)
  })

  it('maps chk_messages_email violation to email-specific message', () => {
    const msg = friendlyErrorMessage({ code: '23514', message: 'chk_messages_email failed' })
    expect(msg.toLowerCase()).toContain('email')
  })

  it('maps chk_social_url violation to URL message', () => {
    const msg = friendlyErrorMessage({ code: '23514', message: 'chk_social_url failed' })
    expect(msg.toLowerCase()).toContain('url')
  })

  // --- HTTP status codes ---
  it('maps status 401 to session expired message', () => {
    const msg = friendlyErrorMessage({ status: 401, message: 'Unauthorized' })
    expect(msg.toLowerCase()).toMatch(/session|sign in/)
    expect(msg).not.toContain('401')
  })

  it('maps JWT token errors to session expired', () => {
    const msg = friendlyErrorMessage({ message: 'JWT expired' })
    expect(msg.toLowerCase()).toMatch(/session|sign in/)
  })

  it('maps status 403 to permission denied message', () => {
    const msg = friendlyErrorMessage({ status: 403, message: 'Forbidden' })
    expect(msg.toLowerCase()).toContain('permission')
    expect(msg).not.toContain('403')
  })

  it('maps row-level security error to permission message', () => {
    const msg = friendlyErrorMessage({ message: 'new row violates row-level security policy' })
    expect(msg.toLowerCase()).toContain('permission')
  })

  it('maps status 404 to not found message', () => {
    const msg = friendlyErrorMessage({ status: 404, message: 'Not Found' })
    expect(msg.toLowerCase()).toMatch(/not found|could not be found/)
    expect(msg).not.toContain('404')
  })

  it('maps status 409 to conflict message', () => {
    const msg = friendlyErrorMessage({ status: 409, message: 'Conflict' })
    expect(msg.toLowerCase()).toMatch(/exist|conflict/)
    expect(msg).not.toContain('409')
  })

  it('maps status 413 to file too large message', () => {
    const msg = friendlyErrorMessage({ status: 413, message: 'Payload Too Large' })
    expect(msg.toLowerCase()).toMatch(/large|size/)
    expect(msg).not.toContain('413')
  })

  it('maps status 429 to rate limit message', () => {
    const msg = friendlyErrorMessage({ status: 429, message: 'Too Many Requests' })
    expect(msg.toLowerCase()).toMatch(/request|wait/)
    expect(msg).not.toContain('429')
  })

  it('maps status 500 to server error message', () => {
    const msg = friendlyErrorMessage({ status: 500, message: 'Internal Server Error' })
    expect(msg.toLowerCase()).toMatch(/unavailable|again/)
    expect(msg).not.toContain('500')
  })

  it('maps status 503 to unavailable message', () => {
    const msg = friendlyErrorMessage({ status: 503, message: 'Service Unavailable' })
    expect(msg.toLowerCase()).toMatch(/unavailable|again/)
  })

  // --- Network errors ---
  it('maps "Failed to fetch" to network error message', () => {
    const msg = friendlyErrorMessage(new Error('Failed to fetch'))
    expect(msg.toLowerCase()).toMatch(/network|connection|timed out/)
  })

  it('maps AbortError to network/timeout message', () => {
    const msg = friendlyErrorMessage(new Error('AbortError: The operation was aborted'))
    expect(msg.toLowerCase()).toMatch(/network|connection|timed out/)
  })

  // --- Optimistic concurrency ---
  it('passes through "changed elsewhere" message', () => {
    const msg = friendlyErrorMessage(new Error('This item was changed elsewhere. Reload and try again.'))
    expect(msg).toContain('changed elsewhere')
  })

  // --- Edge cases ---
  it('returns non-empty string for null input', () => {
    const msg = friendlyErrorMessage(null)
    expect(typeof msg).toBe('string')
    expect(msg.length).toBeGreaterThan(0)
  })

  it('returns non-empty string for undefined input', () => {
    const msg = friendlyErrorMessage(undefined)
    expect(typeof msg).toBe('string')
    expect(msg.length).toBeGreaterThan(0)
  })

  it('returns non-empty string for plain string input', () => {
    const msg = friendlyErrorMessage('Something went wrong')
    expect(typeof msg).toBe('string')
    expect(msg.length).toBeGreaterThan(0)
  })

  it('never leaks database constraint names (chk_*)', () => {
    const msg = friendlyErrorMessage({
      code: '23514',
      message: 'violates check constraint "chk_projects_limits"',
    })
    expect(msg).not.toMatch(/chk_/)
  })

  it('never leaks PostgreSQL error code numbers directly', () => {
    const msg = friendlyErrorMessage({ code: '23505', message: 'duplicate key value' })
    expect(msg).not.toContain('23505')
  })

  it('never leaks SQL column names in check constraint messages', () => {
    const msg = friendlyErrorMessage({
      code: '23514',
      message: 'violates check constraint "chk_cert_url"',
    })
    expect(msg).not.toContain('chk_cert_url')
  })
})
