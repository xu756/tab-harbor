import { expect, test } from 'bun:test'
import {
  calculateBookmarkMove,
  validateBookmarkDraft,
} from '../src/lib/bookmark-dnd'
import type {
  BrowserBookmark,
  BrowserBookmarkCatalog,
  BrowserBookmarkFolder,
} from '../src/lib/types'

const folder = (
  id: string,
  parentId: string | undefined,
  index: number,
  children: BrowserBookmarkFolder[] = [],
): BrowserBookmarkFolder => ({
  id,
  title: id,
  parentId,
  index,
  unmodifiable: false,
  path: [id],
  children,
  bookmarkCount: 0,
})

const bookmark = (
  id: string,
  parentId: string,
  index: number,
): BrowserBookmark => ({
  id,
  title: id,
  url: `https://example.com/${id}`,
  parentId,
  index,
  folderPath: parentId,
  unmodifiable: false,
})

const nestedFolder = folder('nested', 'source-folder', 1)
const sourceFolder = folder('source-folder', undefined, 0, [nestedFolder])
const targetFolder = folder('target-folder', undefined, 1, [
  folder('target-child', 'target-folder', 1),
])
const first = bookmark('first', 'source-folder', 0)
const last = bookmark('last', 'source-folder', 2)
const targetBookmark = bookmark('target-bookmark', 'target-folder', 0)

const catalog: BrowserBookmarkCatalog = {
  folders: [sourceFolder, targetFolder],
  bookmarks: [first, last, targetBookmark],
}

test('trims valid bookmark edits without rewriting the URL', () => {
  expect(
    validateBookmarkDraft({
      title: '  Example  ',
      url: '  chrome://bookmarks/  ',
    }),
  ).toEqual({
    ok: true,
    value: { title: 'Example', url: 'chrome://bookmarks/' },
  })
})

test('rejects empty bookmark titles and URLs', () => {
  expect(validateBookmarkDraft({ title: '   ', url: 'https://example.com' })).toEqual({
    ok: false,
    error: '请输入书签名称',
  })
  expect(validateBookmarkDraft({ title: 'Example', url: '  ' })).toEqual({
    ok: false,
    error: '请输入书签地址',
  })
})

test('calculates forward and backward moves after logically removing the source', () => {
  expect(calculateBookmarkMove(first, last, 'before', catalog)).toEqual({
    parentId: 'source-folder',
    index: 1,
  })
  expect(calculateBookmarkMove(first, last, 'after', catalog)).toEqual({
    parentId: 'source-folder',
    index: 2,
  })
  expect(calculateBookmarkMove(last, first, 'before', catalog)).toEqual({
    parentId: 'source-folder',
    index: 0,
  })
  expect(calculateBookmarkMove(last, first, 'after', catalog)).toEqual({
    parentId: 'source-folder',
    index: 1,
  })
})

test('appends cross-folder drops after every direct child', () => {
  expect(calculateBookmarkMove(first, targetFolder, 'inside', catalog)).toEqual({
    parentId: 'target-folder',
    index: 2,
  })
})
