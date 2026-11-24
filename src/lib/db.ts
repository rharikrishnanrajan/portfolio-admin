import { supabase } from './supabase'
import { validateTableData, type ValidationResult } from './schemas'

export { validateTableData }
export type { ValidationResult }

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
 */
export async function updateRow<T extends Record<string, unknown>>(
  table: string,
  id: string | number,
  data: Partial<T>
): Promise<T> {
  const validation = validateTableData(table, data as Record<string, unknown>, true)
  if (!validation.success) {
    throw new Error(validation.error || 'Validation failed')
  }

  const { data: updated, error } = await supabase
    .from(table)
    .update(validation.data as Record<string, unknown>)
    .eq('id', id)
    .select()

  if (error) throw error
  if (!updated || updated.length === 0) {
    throw new Error('No row was updated. Check the id and your login.')
  }

  return updated[0] as unknown as T
}
