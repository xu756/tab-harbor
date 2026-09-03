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
