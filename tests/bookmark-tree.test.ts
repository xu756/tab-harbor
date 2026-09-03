import { expect, test } from 'bun:test'

test('builds folders at every path level and counts descendant bookmarks', async () => {
  const modulePath = '../src/lib/bookmark-tree'
  const bookmarkTree = await import(modulePath).catch(() => null)

  expect(bookmarkTree).not.toBeNull()
  if (!bookmarkTree) return

  const tree = bookmarkTree.buildBookmarkTree([
    {
      id: '1',
      title: 'Router',
      url: 'https://tanstack.com',
      folderPath: '书签栏 / 开发',
    },
    {
      id: '2',
      title: 'Design',
      url: 'https://example.com',
      folderPath: '书签栏 / 设计',
    },
  ])

  expect(tree[0]?.name).toBe('书签栏')
  expect(tree[0]?.bookmarkCount).toBe(2)
  expect(tree[0]?.folders.map((folder: { name: string }) => folder.name)).toEqual([
    '开发',
    '设计',
  ])
})
