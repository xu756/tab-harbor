import { expect, test } from 'bun:test'
import * as catalogModule from '../src/lib/bookmark-catalog'

const bookmarkNodes = [
  {
    id: '0',
    title: '',
    index: 0,
    children: [
      {
        id: '1',
        title: '书签栏',
        index: 0,
        folderType: 'bookmarks-bar',
        children: [
          { id: '10', title: '空文件夹', index: 0, children: [] },
          {
            id: '11',
            title: '开发',
            index: 1,
            children: [
              {
                id: '100',
                parentId: '11',
                title: 'Router',
                url: 'https://tanstack.com',
                index: 0,
              },
            ],
          },
        ],
      },
      {
        id: '2',
        title: 'Managed',
        index: 1,
        unmodifiable: 'managed',
        children: [
          {
            id: '200',
            parentId: '2',
            title: 'Policy',
            url: 'https://example.com/policy',
            index: 0,
          },
        ],
      },
    ],
  },
]

test('normalizes empty, nested, and managed bookmark folders', () => {
  const catalog = catalogModule.normalizeBookmarkCatalog(bookmarkNodes)

  expect(catalog.folders.map((folder: { id: string }) => folder.id)).toEqual([
    '1',
    '2',
  ])
  expect(catalog.folders[0].children[0].title).toBe('空文件夹')
  expect(catalog.folders[0].children[0].bookmarkCount).toBe(0)
  expect(catalog.folders[0].children[1].path).toEqual(['书签栏', '开发'])
  expect(catalog.folders[0].bookmarkCount).toBe(1)
  expect(catalog.bookmarks[0]).toMatchObject({
    id: '100',
    parentId: '11',
    index: 0,
    folderPath: '书签栏 / 开发',
    unmodifiable: false,
  })
  expect(catalog.bookmarks[1].unmodifiable).toBe(true)
})

test('returns only direct bookmarks for a selected folder', () => {
  expect('bookmarksForFolder' in catalogModule).toBe(true)
  const catalog = catalogModule.normalizeBookmarkCatalog(bookmarkNodes)
  const bookmarksForFolder = (
    catalogModule as typeof catalogModule & {
      bookmarksForFolder: (
        catalog: typeof catalog,
        folderId: string,
      ) => Array<{ id: string }>
    }
  ).bookmarksForFolder

  expect(bookmarksForFolder(catalog, '11').map((bookmark) => bookmark.id)).toEqual([
    '100',
  ])
  expect(bookmarksForFolder(catalog, '1')).toEqual([])
})

test('searches bookmark titles, URLs, and folder paths', () => {
  expect('searchCatalog' in catalogModule).toBe(true)
  const catalog = catalogModule.normalizeBookmarkCatalog(bookmarkNodes)
  const searchCatalog = (
    catalogModule as typeof catalogModule & {
      searchCatalog: (
        catalog: typeof catalog,
        query: string,
      ) => Array<{ id: string }>
    }
  ).searchCatalog

  expect(searchCatalog(catalog, 'router').map((bookmark) => bookmark.id)).toEqual([
    '100',
  ])
  expect(searchCatalog(catalog, 'policy').map((bookmark) => bookmark.id)).toEqual([
    '200',
  ])
  expect(searchCatalog(catalog, '开发').map((bookmark) => bookmark.id)).toEqual([
    '100',
  ])
})
