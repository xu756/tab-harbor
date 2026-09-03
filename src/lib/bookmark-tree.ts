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
