import { expect, test } from 'bun:test'
import * as bookmarkTree from '../src/lib/bookmark-tree'

test('builds folders at every path level and counts descendant bookmarks', () => {
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

test('expands only top-level folders on first use', () => {
  expect('getInitialExpandedFolderIds' in bookmarkTree).toBe(true)
  expect('flattenBookmarkTree' in bookmarkTree).toBe(true)

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
  const getInitialExpandedFolderIds = (
    bookmarkTree as typeof bookmarkTree & {
      getInitialExpandedFolderIds: (tree: typeof tree) => Set<string>
    }
  ).getInitialExpandedFolderIds
  const flattenBookmarkTree = (
    bookmarkTree as typeof bookmarkTree & {
      flattenBookmarkTree: (
        tree: typeof tree,
        expanded: ReadonlySet<string>,
        search: string,
      ) => Array<{ label: string }>
    }
  ).flattenBookmarkTree

  const expanded = getInitialExpandedFolderIds(tree)

  expect([...expanded]).toEqual([tree[0]!.id])
  expect(flattenBookmarkTree(tree, expanded, '').map((row) => row.label)).toEqual([
    '书签栏',
    '开发',
    '设计',
  ])
})

test('reveals matching bookmarks with every ancestor during search', () => {
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

  expect(
    bookmarkTree
      .flattenBookmarkTree(tree, new Set(), 'router')
      .map((row) => row.label),
  ).toEqual(['书签栏', '开发', 'Router'])
})

test('reveals a matching folder and its complete subtree', () => {
  const tree = bookmarkTree.buildBookmarkTree([
    {
      id: '1',
      title: 'Router',
      url: 'https://tanstack.com',
      folderPath: '书签栏 / 开发',
    },
    {
      id: '2',
      title: 'MDN',
      url: 'https://developer.mozilla.org',
      folderPath: '书签栏 / 开发 / 文档',
    },
    {
      id: '3',
      title: 'Design',
      url: 'https://example.com',
      folderPath: '书签栏 / 设计',
    },
  ])

  expect(
    bookmarkTree
      .flattenBookmarkTree(tree, new Set(), '开发')
      .map((row) => row.label),
  ).toEqual(['书签栏', '开发', '文档', 'MDN', 'Router'])
})

test('restores persisted expanded folder ids', () => {
  expect('parseExpandedFolderIds' in bookmarkTree).toBe(true)
  const parseExpandedFolderIds = (
    bookmarkTree as typeof bookmarkTree & {
      parseExpandedFolderIds: (
        raw: string | null,
        fallback: ReadonlySet<string>,
      ) => Set<string>
    }
  ).parseExpandedFolderIds

  expect(
    parseExpandedFolderIds('["folder:a"]', new Set(['folder:fallback'])),
  ).toEqual(new Set(['folder:a']))
})

test('falls back when persisted expansion state is invalid', () => {
  const fallback = new Set(['folder:fallback'])

  expect(bookmarkTree.parseExpandedFolderIds('invalid', fallback)).toEqual(
    fallback,
  )
  expect(bookmarkTree.parseExpandedFolderIds('{"folder":true}', fallback)).toEqual(
    fallback,
  )
})

test('asks to expand a collapsed folder on ArrowRight', () => {
  expect('getBookmarkTreeKeyAction' in bookmarkTree).toBe(true)
  const tree = bookmarkTree.buildBookmarkTree([
    {
      id: '1',
      title: 'Router',
      url: 'https://tanstack.com',
      folderPath: '书签栏 / 开发',
    },
  ])
  const rows = bookmarkTree.flattenBookmarkTree(
    tree,
    bookmarkTree.getInitialExpandedFolderIds(tree),
    '',
  )
  const getBookmarkTreeKeyAction = (
    bookmarkTree as typeof bookmarkTree & {
      getBookmarkTreeKeyAction: (
        rows: typeof rows,
        currentId: string,
        key: string,
      ) => unknown
    }
  ).getBookmarkTreeKeyAction

  expect(getBookmarkTreeKeyAction(rows, rows[1]!.id, 'ArrowRight')).toEqual({
    type: 'expand',
    id: rows[1]!.id,
  })
})

test('moves focus between visible rows', () => {
  const tree = bookmarkTree.buildBookmarkTree([
    {
      id: '1',
      title: 'Router',
      url: 'https://tanstack.com',
      folderPath: '书签栏 / 开发',
    },
  ])
  const expanded = new Set([
    tree[0]!.id,
    tree[0]!.folders[0]!.id,
  ])
  const rows = bookmarkTree.flattenBookmarkTree(tree, expanded, '')

  expect(
    bookmarkTree.getBookmarkTreeKeyAction(rows, rows[0]!.id, 'ArrowDown'),
  ).toEqual({ type: 'focus', id: rows[1]!.id })
  expect(
    bookmarkTree.getBookmarkTreeKeyAction(rows, rows[1]!.id, 'ArrowUp'),
  ).toEqual({ type: 'focus', id: rows[0]!.id })
  expect(
    bookmarkTree.getBookmarkTreeKeyAction(rows, rows[2]!.id, 'Home'),
  ).toEqual({ type: 'focus', id: rows[0]!.id })
  expect(
    bookmarkTree.getBookmarkTreeKeyAction(rows, rows[0]!.id, 'End'),
  ).toEqual({ type: 'focus', id: rows[2]!.id })
})

test('moves between parents and children with horizontal arrows', () => {
  const tree = bookmarkTree.buildBookmarkTree([
    {
      id: '1',
      title: 'Router',
      url: 'https://tanstack.com',
      folderPath: '书签栏 / 开发',
    },
  ])
  const expanded = new Set([
    tree[0]!.id,
    tree[0]!.folders[0]!.id,
  ])
  const rows = bookmarkTree.flattenBookmarkTree(tree, expanded, '')

  expect(
    bookmarkTree.getBookmarkTreeKeyAction(rows, rows[0]!.id, 'ArrowRight'),
  ).toEqual({ type: 'focus', id: rows[1]!.id })
  expect(
    bookmarkTree.getBookmarkTreeKeyAction(rows, rows[1]!.id, 'ArrowLeft'),
  ).toEqual({ type: 'collapse', id: rows[1]!.id })
  expect(
    bookmarkTree.getBookmarkTreeKeyAction(rows, rows[2]!.id, 'ArrowLeft'),
  ).toEqual({ type: 'focus', id: rows[1]!.id })
})

test('activates the focused row with Enter', () => {
  const tree = bookmarkTree.buildBookmarkTree([
    {
      id: '1',
      title: 'Router',
      url: 'https://tanstack.com',
      folderPath: '书签栏 / 开发',
    },
  ])
  const expanded = new Set([
    tree[0]!.id,
    tree[0]!.folders[0]!.id,
  ])
  const rows = bookmarkTree.flattenBookmarkTree(tree, expanded, '')

  expect(
    bookmarkTree.getBookmarkTreeKeyAction(rows, rows[0]!.id, 'Enter'),
  ).toEqual({ type: 'collapse', id: rows[0]!.id })
  expect(
    bookmarkTree.getBookmarkTreeKeyAction(rows, rows[2]!.id, 'Enter'),
  ).toEqual({ type: 'activate', id: rows[2]!.id })
})
