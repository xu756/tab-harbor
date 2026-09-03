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
