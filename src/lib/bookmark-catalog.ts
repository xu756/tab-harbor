import type {
  BrowserBookmark,
  BrowserBookmarkCatalog,
  BrowserBookmarkFolder,
} from './types'

export interface BookmarkNodeInput {
  id: string
  title?: string
  url?: string
  parentId?: string
  index?: number
  dateAdded?: number
  folderType?: string
  unmodifiable?: string | boolean
  children?: BookmarkNodeInput[]
}

export function normalizeBookmarkCatalog(
  nodes: BookmarkNodeInput[],
): BrowserBookmarkCatalog {
  const bookmarks: BrowserBookmark[] = []
  const rootNodes =
    nodes.length === 1 && !nodes[0]?.url && !nodes[0]?.title
      ? nodes[0].children ?? []
      : nodes

  const visitFolder = (
    node: BookmarkNodeInput,
    path: string[],
    inheritedUnmodifiable: boolean,
    fallbackIndex: number,
  ): BrowserBookmarkFolder => {
    const title = node.title?.trim() || '未命名文件夹'
    const nextPath = [...path, title]
    const unmodifiable = inheritedUnmodifiable || Boolean(node.unmodifiable)
    const children: BrowserBookmarkFolder[] = []

    for (const [childIndex, child] of (node.children ?? []).entries()) {
      if (child.url) {
        bookmarks.push({
          id: child.id,
          title: child.title?.trim() || child.url,
          url: child.url,
          parentId: node.id,
          index: child.index ?? childIndex,
          folderPath: nextPath.join(' / '),
          dateAdded: child.dateAdded,
          unmodifiable: unmodifiable || Boolean(child.unmodifiable),
        })
      } else {
        children.push(
          visitFolder(child, nextPath, unmodifiable, childIndex),
        )
      }
    }

    const bookmarkCount =
      bookmarks.filter((bookmark) => bookmark.parentId === node.id).length +
      children.reduce((total, child) => total + child.bookmarkCount, 0)

    return {
      id: node.id,
      title,
      parentId: node.parentId,
      index: node.index ?? fallbackIndex,
      folderType: node.folderType,
      unmodifiable,
      path: nextPath,
      children,
      bookmarkCount,
    }
  }

  const folders = rootNodes
    .filter((node) => !node.url)
    .map((node, index) => visitFolder(node, [], false, index))

  return { folders, bookmarks }
}

export function flattenCatalogFolders(
  folders: BrowserBookmarkFolder[],
): BrowserBookmarkFolder[] {
  return folders.flatMap((folder) => [
    folder,
    ...flattenCatalogFolders(folder.children),
  ])
}

export function bookmarksForFolder(
  catalog: BrowserBookmarkCatalog,
  folderId: string,
) {
  return catalog.bookmarks
    .filter((bookmark) => bookmark.parentId === folderId)
    .sort((left, right) => left.index - right.index)
}

export function searchCatalog(
  catalog: BrowserBookmarkCatalog,
  query: string,
) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return []
  return catalog.bookmarks.filter((bookmark) =>
    `${bookmark.title} ${bookmark.url} ${bookmark.folderPath}`
      .toLowerCase()
      .includes(normalized),
  )
}
