import { flattenCatalogFolders } from './bookmark-catalog'
import type { BrowserBookmarkCatalog } from './types'

export const BOOKMARK_ORGANIZER_STATE_KEY = 'harbor.bookmarks.organizer.v2'

export interface BookmarkOrganizerState {
  selectedFolderId: string
  expandedFolderIds: string[]
}

export function resolveBookmarkOrganizerState(
  catalog: BrowserBookmarkCatalog,
  stored?: unknown,
): BookmarkOrganizerState {
  const folders = flattenCatalogFolders(catalog.folders)
  const folderIds = new Set(folders.map((folder) => folder.id))
  const fallback =
    catalog.folders.find((folder) => folder.folderType === 'bookmarks-bar' && !folder.unmodifiable) ??
    folders.find((folder) => !folder.unmodifiable) ??
    catalog.folders[0]

  if (!stored || typeof stored !== 'object') {
    return {
      selectedFolderId: fallback?.id ?? '',
      expandedFolderIds: folders.map((folder) => folder.id),
    }
  }

  const candidate = stored as Partial<Record<keyof BookmarkOrganizerState, unknown>>
  const storedExpansion = candidate.expandedFolderIds
  const validExpansion = Array.isArray(storedExpansion) &&
    storedExpansion.every((id) => typeof id === 'string')
    ? storedExpansion.filter((id): id is string => typeof id === 'string' && folderIds.has(id))
    : undefined

  return {
    selectedFolderId:
      typeof candidate.selectedFolderId === 'string' && folderIds.has(candidate.selectedFolderId)
        ? candidate.selectedFolderId
        : fallback?.id ?? '',
    expandedFolderIds: validExpansion ?? folders.map((folder) => folder.id),
  }
}
