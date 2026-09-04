import { expect, test } from 'bun:test'
import { runBookmarkImport } from '../src/lib/chrome'
import type { ImportedBookmarkNode } from '../src/lib/bookmark-html'

const importedNodes: ImportedBookmarkNode[] = [
  {
    kind: 'folder',
    title: '开发',
    children: [
      {
        kind: 'bookmark',
        title: 'Router',
        url: 'https://tanstack.com/router',
      },
    ],
  },
  {
    kind: 'bookmark',
    title: 'Chrome',
    url: 'chrome://bookmarks/',
  },
]

test('creates imported bookmarks sequentially and reports item progress', async () => {
  const created: Array<{ title: string; parentId?: string; url?: string }> = []
  const progress: Array<[number, number]> = []

  const rootId = await runBookmarkImport(
    importedNodes,
    {
      async create(details) {
        created.push(details)
        return { id: `created-${created.length}` }
      },
      async removeTree() {
        throw new Error('should not rollback a successful import')
      },
    },
    (done, total) => progress.push([done, total]),
    new Date('2026-09-03T08:00:00.000Z'),
  )

  expect(rootId).toBe('created-1')
  expect(created).toEqual([
    { title: '导入的书签 · 2026-09-03' },
    { title: '开发', parentId: 'created-1' },
    {
      title: 'Router',
      url: 'https://tanstack.com/router',
      parentId: 'created-2',
    },
    {
      title: 'Chrome',
      url: 'chrome://bookmarks/',
      parentId: 'created-1',
    },
  ])
  expect(progress).toEqual([
    [0, 3],
    [1, 3],
    [2, 3],
    [3, 3],
  ])
})

test('rolls back only the newly created import root after a child failure', async () => {
  const removed: string[] = []
  let creates = 0

  await expect(
    runBookmarkImport(
      importedNodes,
      {
        async create() {
          creates += 1
          if (creates === 3) throw new Error('create failed')
          return { id: `created-${creates}` }
        },
        async removeTree(id) {
          removed.push(id)
        },
      },
      () => undefined,
      new Date('2026-09-03T08:00:00.000Z'),
    ),
  ).rejects.toThrow('create failed')

  expect(removed).toEqual(['created-1'])
})
