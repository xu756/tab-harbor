import type { BrowserBookmark } from './types'

export interface BookmarkLeafNode {
  kind: 'bookmark'
  id: string
  bookmark: BrowserBookmark
}

export interface BookmarkFolderNode {
  kind: 'folder'
  id: string
  name: string
  path: string[]
  depth: number
  folders: BookmarkFolderNode[]
  bookmarks: BookmarkLeafNode[]
  bookmarkCount: number
}

interface BookmarkTreeRowBase {
  id: string
  label: string
  depth: number
  parentId?: string
}

export interface BookmarkFolderRow extends BookmarkTreeRowBase {
  kind: 'folder'
  folder: BookmarkFolderNode
  expanded: boolean
  hasChildren: boolean
}

export interface BookmarkLeafRow extends BookmarkTreeRowBase {
  kind: 'bookmark'
  bookmark: BrowserBookmark
}

export type BookmarkTreeRow = BookmarkFolderRow | BookmarkLeafRow

export type BookmarkTreeKeyAction =
  | { type: 'focus'; id: string }
  | { type: 'expand'; id: string }
  | { type: 'collapse'; id: string }
  | { type: 'activate'; id: string }
  | { type: 'none' }

export function buildBookmarkTree(
  bookmarks: BrowserBookmark[],
): BookmarkFolderNode[] {
  const roots: BookmarkFolderNode[] = []
  const foldersById = new Map<string, BookmarkFolderNode>()

  for (const bookmark of bookmarks) {
    const segments = bookmark.folderPath
      .split(' / ')
      .map((part) => part.trim())
      .filter(Boolean)
    let siblings = roots
    let parent: BookmarkFolderNode | undefined
    const path: string[] = []

    for (const name of segments.length > 0 ? segments : ['书签']) {
      path.push(name)
      const id = `folder:${path.join('\u001f')}`
      let folder = foldersById.get(id)

      if (!folder) {
        folder = {
          kind: 'folder',
          id,
          name,
          path: [...path],
          depth: path.length - 1,
          folders: [],
          bookmarks: [],
          bookmarkCount: 0,
        }
        foldersById.set(id, folder)
        siblings.push(folder)
      }

      parent = folder
      siblings = folder.folders
    }

    parent?.bookmarks.push({
      kind: 'bookmark',
      id: `bookmark:${bookmark.id}`,
      bookmark,
    })
  }

  const countBookmarks = (folder: BookmarkFolderNode): number =>
    folder.bookmarks.length +
    folder.folders.reduce(
      (total, child) => total + countBookmarks(child),
      0,
    )

  for (const folder of foldersById.values()) {
    folder.bookmarkCount = countBookmarks(folder)
  }

  return roots
}

export function getInitialExpandedFolderIds(tree: BookmarkFolderNode[]) {
  return new Set(tree.map((folder) => folder.id))
}

export function parseExpandedFolderIds(
  raw: string | null,
  fallback: ReadonlySet<string>,
) {
  if (!raw) return new Set(fallback)
  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) && value.every((id) => typeof id === 'string')
      ? new Set(value)
      : new Set(fallback)
  } catch {
    return new Set(fallback)
  }
}

export function flattenBookmarkTree(
  tree: BookmarkFolderNode[],
  expanded: ReadonlySet<string>,
  search: string,
): BookmarkTreeRow[] {
  const query = search.trim().toLowerCase()
  if (query) {
    return tree.flatMap((folder) => flattenMatchingFolder(folder, query))
  }

  const rows: BookmarkTreeRow[] = []

  const visitFolder = (folder: BookmarkFolderNode, parentId?: string) => {
    const isExpanded = expanded.has(folder.id)
    rows.push({
      kind: 'folder',
      id: folder.id,
      label: folder.name,
      depth: folder.depth,
      parentId,
      folder,
      expanded: isExpanded,
      hasChildren: folder.folders.length > 0 || folder.bookmarks.length > 0,
    })

    if (!isExpanded) return
    for (const child of folder.folders) visitFolder(child, folder.id)
    for (const leaf of folder.bookmarks) {
      rows.push({
        kind: 'bookmark',
        id: leaf.id,
        label: leaf.bookmark.title,
        depth: folder.depth + 1,
        parentId: folder.id,
        bookmark: leaf.bookmark,
      })
    }
  }

  for (const folder of tree) visitFolder(folder)
  return rows
}

export function getBookmarkTreeKeyAction(
  rows: BookmarkTreeRow[],
  currentId: string,
  key: string,
): BookmarkTreeKeyAction {
  const currentIndex = rows.findIndex((row) => row.id === currentId)
  const current = rows[currentIndex]
  if (!current) return { type: 'none' }

  if (key === 'ArrowDown' && currentIndex < rows.length - 1) {
    return { type: 'focus', id: rows[currentIndex + 1]!.id }
  }
  if (key === 'ArrowUp' && currentIndex > 0) {
    return { type: 'focus', id: rows[currentIndex - 1]!.id }
  }
  if (key === 'Home' && rows[0]) {
    return { type: 'focus', id: rows[0].id }
  }
  if (key === 'End' && rows.at(-1)) {
    return { type: 'focus', id: rows.at(-1)!.id }
  }
  if (
    key === 'ArrowRight' &&
    current.kind === 'folder' &&
    current.hasChildren &&
    !current.expanded
  ) {
    return { type: 'expand', id: current.id }
  }
  if (
    key === 'ArrowRight' &&
    current.kind === 'folder' &&
    current.expanded &&
    rows[currentIndex + 1]?.depth > current.depth
  ) {
    return { type: 'focus', id: rows[currentIndex + 1]!.id }
  }
  if (key === 'ArrowLeft' && current.kind === 'folder' && current.expanded) {
    return { type: 'collapse', id: current.id }
  }
  if (key === 'ArrowLeft' && current.parentId) {
    return { type: 'focus', id: current.parentId }
  }
  if (key === 'Enter' && current.kind === 'folder' && current.hasChildren) {
    return {
      type: current.expanded ? 'collapse' : 'expand',
      id: current.id,
    }
  }
  if (key === 'Enter' && current.kind === 'bookmark') {
    return { type: 'activate', id: current.id }
  }

  return { type: 'none' }
}

function flattenMatchingFolder(
  folder: BookmarkFolderNode,
  query: string,
  parentId?: string,
): BookmarkTreeRow[] {
  const childRows = folder.folders.flatMap((child) =>
    flattenMatchingFolder(child, query, folder.id),
  )
  const bookmarkRows: BookmarkLeafRow[] = folder.bookmarks
    .filter(({ bookmark }) =>
      `${bookmark.title} ${bookmark.url} ${bookmark.folderPath}`
        .toLowerCase()
        .includes(query),
    )
    .map(({ id, bookmark }) => ({
      kind: 'bookmark',
      id,
      label: bookmark.title,
      depth: folder.depth + 1,
      parentId: folder.id,
      bookmark,
    }))

  if (childRows.length === 0 && bookmarkRows.length === 0) return []

  return [
    {
      kind: 'folder',
      id: folder.id,
      label: folder.name,
      depth: folder.depth,
      parentId,
      folder,
      expanded: true,
      hasChildren: true,
    },
    ...childRows,
    ...bookmarkRows,
  ]
}
