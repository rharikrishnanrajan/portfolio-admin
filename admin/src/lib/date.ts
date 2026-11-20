/**
 * Month-level date utilities for HTML <input type="month"> and Supabase date columns.
 */

/**
 * Converts HTML month input string ("YYYY-MM") to DB date ("YYYY-MM-01").
 */
export function monthToDbDate(month: string | null | undefined): string | null {
  if (!month || !month.trim()) return null
  const trimmed = month.trim()
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return `${trimmed}-01`
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10)
  }
  return null
}

/**
 * Converts DB date string ("YYYY-MM-01" or ISO) to HTML month input ("YYYY-MM").
 */
export function dbDateToMonth(dbDate: string | null | undefined): string {
  if (!dbDate || !dbDate.trim()) return ''
  return dbDate.trim().slice(0, 7)
}

/**
 * Formats a DB date string ("YYYY-MM-01") for friendly human display ("May 2024").
 */
export function formatMonthDisplay(dbDate: string | null | undefined): string {
  if (!dbDate || !dbDate.trim()) return ''
  try {
    const parts = dbDate.trim().slice(0, 7).split('-')
    if (parts.length === 2) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10)
      if (!isNaN(year) && !isNaN(month)) {
        const d = new Date(year, month - 1, 1)
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      }
    }
  } catch {
    // fallback
  }
  return dbDate.slice(0, 7)
}

/**
 * Formats a full DB date string ("YYYY-MM-DD") for human display ("Nov 15, 2023").
 */
export function formatDateDisplay(dateStr: string | null | undefined): string {
  if (!dateStr || !dateStr.trim()) return ''
  try {
    const parts = dateStr.trim().split('-')
    if (parts.length >= 2) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10)
      const day = parts[2] ? parseInt(parts[2], 10) : 1
      if (!isNaN(year) && !isNaN(month)) {
        const d = new Date(year, month - 1, day)
        if (parts[2]) {
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        }
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      }
    }
  } catch {
    // fallback
  }
  return dateStr
}
