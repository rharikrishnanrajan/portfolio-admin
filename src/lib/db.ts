import { supabase } from './supabase'
import { validateTableData, type ValidationResult } from './schemas'

export { validateTableData }
export type { ValidationResult }

/**
 * Executes a read query with a 15-second timeout via AbortController
 * and up to 3 retries with exponential backoff and jitter on network errors and 5xx/429.
 */
export async function withReadRetry<T>(
  queryFn: (signal: AbortSignal) => Promise<T>,
  maxRetries = 3,
  timeoutMs = 15000
): Promise<T> {
  let attempt = 0
  while (true) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await queryFn(controller.signal)
      clearTimeout(timeoutId)
      if (res && typeof res === 'object' && 'error' in res && (res as { error: unknown }).error) {
        throw (res as { error: unknown }).error
      }
      return res
    } catch (err: unknown) {
      clearTimeout(timeoutId)
      attempt++
      const isAbort = controller.signal.aborted || (err as { name?: string })?.name === 'AbortError'
      const status = (err as { status?: number })?.status || (err as { statusCode?: number })?.statusCode
      const is5xxOr429 = status === 429 || (status !== undefined && status >= 500 && status < 600)
      const isNetwork = isAbort || (err instanceof Error && /network|failed to fetch|abort/i.test(err.message))

      if (attempt <= maxRetries && (isNetwork || is5xxOr429)) {
        const delay = Math.pow(2, attempt) * 200 + Math.random() * 200
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }
      throw err
    }
  }
}

/**
 * Validates and inserts a record into the specified table.
 */
export async function insertRow<T extends Record<string, unknown>>(
  table: string,
  data: Partial<T>
): Promise<T> {
  const validation = validateTableData(table, data as Record<string, unknown>, false)
  if (!validation.success) {
    throw new Error(validation.error || 'Validation failed')
  }

  const { data: inserted, error } = await supabase
    .from(table)
    .insert(validation.data as Record<string, unknown>)
    .select()

  if (error) throw error
  if (!inserted || inserted.length === 0) {
    throw new Error('No row was inserted. Check your login and permissions.')
  }

  return inserted[0] as unknown as T
}

/**
 * Validates and updates a record in the specified table.
 * Supports optimistic concurrency matching loadedUpdatedAt if provided.
 */
export async function updateRow<T extends Record<string, unknown>>(
  table: string,
  id: string | number,
  data: Partial<T>,
  loadedUpdatedAt?: string | null
): Promise<T> {
  const validation = validateTableData(table, data as Record<string, unknown>, true)
  if (!validation.success) {
    throw new Error(validation.error || 'Validation failed')
  }

  let query = supabase
    .from(table)
    .update(validation.data as Record<string, unknown>)
    .eq('id', id)

  if (loadedUpdatedAt) {
    query = query.eq('updated_at', loadedUpdatedAt)
  }

  const { data: updated, error } = await query.select()

  if (error) throw error
  if (!updated || updated.length === 0) {
    if (loadedUpdatedAt) {
      throw new Error('This item was changed elsewhere. Reload and try again.')
    }
    throw new Error('No row was updated. Check the id and your login.')
  }

  return updated[0] as unknown as T
}
