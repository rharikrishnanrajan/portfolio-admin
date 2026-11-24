import { supabase } from './supabase'
import { removeFile, removeFiles, extractStoragePath } from './storage'
import type { ProjectFile } from '../types/rows'

/**
 * Removes all storage files associated with a project:
 * - Documents in 'project-documents' bucket (<projectId>/...)
 * - Cover image in 'portfolio' bucket (projects/<projectId>/...)
 */
export async function deleteProjectStorage(
  projectId: string,
  files: ProjectFile[] = [],
  coverUrl?: string | null
): Promise<void> {
  // 1. Delete documents from project-documents bucket
  const docPaths = new Set<string>()
  files.forEach((f) => {
    if (f.path) docPaths.add(f.path)
  })

  try {
    const { data: docList } = await supabase.storage.from('project-documents').list(projectId)
    if (docList && docList.length > 0) {
      docList.forEach((f) => {
        if (f.name) docPaths.add(`${projectId}/${f.name}`)
      })
    }
  } catch (err) {
    console.warn('Could not list project-documents directory:', err)
  }

  if (docPaths.size > 0) {
    try {
      await removeFiles('project-documents', Array.from(docPaths))
    } catch (err) {
      console.warn('Failed to remove documents from storage:', err)
    }
  }

  // 2. Delete cover image from portfolio bucket
  const coverPaths = new Set<string>()
  if (coverUrl) {
    const path = extractStoragePath('portfolio', coverUrl)
    if (path) coverPaths.add(path)
  }

  try {
    const { data: coverList } = await supabase.storage
      .from('portfolio')
      .list(`projects/${projectId}`)
    if (coverList && coverList.length > 0) {
      coverList.forEach((f) => {
        if (f.name) coverPaths.add(`projects/${projectId}/${f.name}`)
      })
    }
  } catch (err) {
    console.warn('Could not list portfolio project covers directory:', err)
  }

  if (coverPaths.size > 0) {
    try {
      await removeFiles('portfolio', Array.from(coverPaths))
    } catch (err) {
      console.warn('Failed to remove cover images from storage:', err)
    }
  }
}

/**
 * Removes a specific cover image for a project from the portfolio bucket.
 */
export async function deleteProjectCover(
  projectId: string,
  coverUrl: string | null | undefined
): Promise<void> {
  if (!coverUrl) return
  const coverPaths = new Set<string>()
  const path = extractStoragePath('portfolio', coverUrl)
  if (path) coverPaths.add(path)

  try {
    const { data: coverList } = await supabase.storage
      .from('portfolio')
      .list(`projects/${projectId}`)
    if (coverList && coverList.length > 0) {
      coverList.forEach((f) => {
        if (f.name) coverPaths.add(`projects/${projectId}/${f.name}`)
      })
    }
  } catch (err) {
    console.warn('Could not list portfolio project covers:', err)
  }

  if (coverPaths.size > 0) {
    try {
      await removeFiles('portfolio', Array.from(coverPaths))
    } catch (err) {
      console.warn('Failed to remove cover from storage:', err)
    }
  }
}

/**
 * Removes a single document from project-documents bucket.
 */
export async function deleteProjectDocument(file: ProjectFile): Promise<void> {
  if (!file.path) return
  try {
    await removeFile('project-documents', file.path)
  } catch (err) {
    console.warn('Failed to remove document file from storage:', err)
  }
}
