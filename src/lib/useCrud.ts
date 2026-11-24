import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { validateTableData } from './schemas'
import { withReadRetry } from './db'
import { friendlyErrorMessage } from './errors'

export interface UseCrudOptions<T> {
  orderBy?: keyof T & string
  ascending?: boolean
}

export interface UseCrudReturn<T> {
  rows: T[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  save: (row: Partial<T>) => Promise<T>
  remove: (id: string | number) => Promise<void>
  move: (id: string | number, direction: 'up' | 'down') => Promise<void>
  toggle: (id: string | number, field: keyof T & string) => Promise<void>
}

export function useCrud<T extends { id?: string | number; position?: number }>(
  table: string,
  options: UseCrudOptions<T> = {}
): UseCrudReturn<T> {
  const { orderBy = 'position' as keyof T & string, ascending = true } = options
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await withReadRetry(async (signal) => {
        let query = supabase.from(table).select('*').abortSignal(signal)
        if (orderBy) {
          query = query.order(orderBy, { ascending })
        }
        return await query
      })
      setRows((data as unknown as T[]) || [])
    } catch (err) {
      const message = friendlyErrorMessage(err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [table, orderBy, ascending])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = useCallback(
    async (row: Partial<T>): Promise<T> => {
      setError(null)
      const isNew = !row.id

      if (isNew) {
        const rowData = { ...row }
        delete rowData.id

        // New list rows get position = (max position) + 10
        if (rowData.position === undefined) {
          const maxPos = rows.reduce((max, r) => {
            const pos = typeof r.position === 'number' ? r.position : 0
            return pos > max ? pos : max
          }, 0)
          rowData.position = rows.length > 0 ? maxPos + 10 : 10
        }

        const validation = validateTableData(table, rowData as Record<string, unknown>, false)
        if (!validation.success) {
          throw new Error(validation.error || 'Validation failed')
        }

        const { data, error: insertError } = await supabase
          .from(table)
          .insert((validation.data || rowData) as unknown as Record<string, unknown>)
          .select()

        if (insertError) throw insertError
        if (!data || data.length === 0) {
          throw new Error('No row was inserted. Check your login and permissions.')
        }

        const savedRow = data[0] as unknown as T
        setRows((prev) => {
          const next = [...prev, savedRow]
          if (orderBy) {
            return next.sort((a, b) => {
              const valA = a[orderBy]
              const valB = b[orderBy]
              if (valA === valB) return 0
              if (valA === undefined || valA === null) return 1
              if (valB === undefined || valB === null) return -1
              return ascending
                ? valA > valB ? 1 : -1
                : valA < valB ? 1 : -1
            })
          }
          return next
        })
        return savedRow
      } else {
        const loadedUpdatedAt = (row as Record<string, unknown>).updated_at as string | undefined
        const { id, ...updates } = row
        delete (updates as Record<string, unknown>).updated_at

        if (!id) {
          throw new Error('No row was updated. Check the id and your login.')
        }

        const validation = validateTableData(table, updates as Record<string, unknown>, true)
        if (!validation.success) {
          throw new Error(validation.error || 'Validation failed')
        }

        let updateQuery = supabase
          .from(table)
          .update((validation.data || updates) as unknown as Record<string, unknown>)
          .eq('id', id)

        if (loadedUpdatedAt) {
          updateQuery = updateQuery.eq('updated_at', loadedUpdatedAt)
        }

        const { data, error: updateError } = await updateQuery.select()

        if (updateError) throw updateError
        if (!data || data.length === 0) {
          if (loadedUpdatedAt) {
            throw new Error('This item was changed elsewhere. Reload and try again.')
          }
          throw new Error('No row was updated. Check the id and your login.')
        }

        const savedRow = data[0] as unknown as T
        setRows((prev) => prev.map((r) => (r.id === id ? savedRow : r)))
        return savedRow
      }
    },
    [table, rows, orderBy, ascending]
  )

  const remove = useCallback(
    async (id: string | number): Promise<void> => {
      setError(null)
      const { error: deleteError } = await supabase.from(table).delete().eq('id', id)
      if (deleteError) throw deleteError
      setRows((prev) => prev.filter((r) => r.id !== id))
    },
    [table]
  )

  const move = useCallback(
    async (id: string | number, direction: 'up' | 'down'): Promise<void> => {
      setError(null)
      const idx = rows.findIndex((r) => r.id === id)
      if (idx === -1) return
      if (direction === 'up' && idx === 0) return
      if (direction === 'down' && idx === rows.length - 1) return

      const neighborIdx = direction === 'up' ? idx - 1 : idx + 1
      const current = rows[idx]
      const neighbor = rows[neighborIdx]

      const currentPos = typeof current.position === 'number' ? current.position : idx * 10
      const neighborPos = typeof neighbor.position === 'number' ? neighbor.position : neighborIdx * 10

      let nextCurrentPos = neighborPos
      let nextNeighborPos = currentPos

      // In case positions were identical in the database
      if (currentPos === neighborPos) {
        nextCurrentPos = direction === 'up' ? neighborPos - 5 : neighborPos + 5
        nextNeighborPos = neighborPos
      }

      const [res1, res2] = await Promise.all([
        supabase.from(table).update({ position: nextCurrentPos }).eq('id', current.id).select(),
        supabase.from(table).update({ position: nextNeighborPos }).eq('id', neighbor.id).select(),
      ])

      if (res1.error) throw res1.error
      if (res2.error) throw res2.error

      setRows((prev) => {
        const copy = [...prev]
        copy[idx] = (res1.data?.[0] as unknown as T) || { ...current, position: nextCurrentPos }
        copy[neighborIdx] = (res2.data?.[0] as unknown as T) || { ...neighbor, position: nextNeighborPos }
        return copy.sort((a, b) => {
          const posA = typeof a.position === 'number' ? a.position : 0
          const posB = typeof b.position === 'number' ? b.position : 0
          return posA - posB
        })
      })
    },
    [rows, table]
  )

  const toggle = useCallback(
    async (id: string | number, field: keyof T & string): Promise<void> => {
      setError(null)
      const current = rows.find((r) => r.id === id)
      if (!current) return

      const nextValue = !current[field]
      const loadedUpdatedAt = (current as Record<string, unknown>).updated_at as string | undefined

      let updateQuery = supabase
        .from(table)
        .update({ [field]: nextValue })
        .eq('id', id)

      if (loadedUpdatedAt) {
        updateQuery = updateQuery.eq('updated_at', loadedUpdatedAt)
      }

      const { data, error: toggleError } = await updateQuery.select()

      if (toggleError) throw toggleError
      if (!data || data.length === 0) {
        if (loadedUpdatedAt) {
          throw new Error('This item was changed elsewhere. Reload and try again.')
        }
        throw new Error('No row was updated. Check the id and your login.')
      }

      const savedRow = data[0] as unknown as T
      setRows((prev) =>
        prev.map((r) => (r.id === id ? savedRow : r))
      )
    },
    [rows, table]
  )

  return {
    rows,
    loading,
    error,
    reload,
    save,
    remove,
    move,
    toggle,
  }
}
