import { flattenCatalogFolders } from './bookmark-catalog'
import type {
  BrowserBookmark,
  BrowserBookmarkCatalog,
  BrowserBookmarkFolder,
} from './types'

export function validateBookmarkDraft(draft: { title: string; url: string }):
  | { ok: true; value: { title: string; url: string } }
  | { ok: false; error: string } {
  const title = draft.title.trim()
  const url = draft.url.trim()

  if (!title) return { ok: false, error: '请输入书签名称' }
  if (!url) return { ok: false, error: '请输入书签地址' }

  return { ok: true, value: { title, url } }
}

function directChildren(
  catalog: BrowserBookmarkCatalog,
  parentId: string,
) {
  const folders = flattenCatalogFolders(catalog.folders)
    .filter((folder) => folder.parentId === parentId)
    .map((folder) => ({ id: folder.id, index: folder.index }))
  const bookmarks = catalog.bookmarks
    .filter((bookmark) => bookmark.parentId === parentId)
    .map((bookmark) => ({ id: bookmark.id, index: bookmark.index }))

  return [...folders, ...bookmarks].sort((left, right) => left.index - right.index)
}

export function calculateBookmarkMove(
  source: BrowserBookmark,
  target: BrowserBookmark | BrowserBookmarkFolder,
  placement: 'before' | 'after' | 'inside',
  catalog: BrowserBookmarkCatalog,
): { parentId: string; index: number } {
  if (placement === 'inside') {
    return {
      parentId: target.id,
      index: directChildren(catalog, target.id).filter(
        (child) => child.id !== source.id,
      ).length,
    }
  }

  if (!target.parentId) {
    throw new Error('顶层书签节点不能作为排序目标')
  }

  const destination = directChildren(catalog, target.parentId).filter(
    (child) => child.id !== source.id,
  )
  const targetIndex = destination.findIndex((child) => child.id === target.id)

  if (targetIndex < 0) throw new Error('找不到拖拽目标')

  return {
    parentId: target.parentId,
    index: targetIndex + (placement === 'after' ? 1 : 0),
  }
}
