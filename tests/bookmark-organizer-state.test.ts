import { expect, test } from 'bun:test'

import { normalizeBookmarkCatalog } from '../src/lib/bookmark-catalog'
import {
  BOOKMARK_ORGANIZER_STATE_KEY,
  resolveBookmarkOrganizerState,
} from '../src/lib/bookmark-organizer-state'

const catalog = normalizeBookmarkCatalog([{ id: '0', title: '', children: [
  { id: '1', title: '书签栏', children: [
    { id: '11', parentId: '1', title: '开发', children: [
      { id: '111', parentId: '11', title: '文档', children: [] },
    ] },
  ] },
  { id: '2', title: '其他书签', children: [] },
] }])

test('uses a versioned key and expands every folder on first visit', () => {
  expect(BOOKMARK_ORGANIZER_STATE_KEY).toBe('harbor.bookmarks.organizer.v2')
  expect(resolveBookmarkOrganizerState(catalog)).toEqual({
    selectedFolderId: '1',
    expandedFolderIds: ['1', '11', '111', '2'],
  })
})

test('restores only valid persisted selection and expansion ids', () => {
  expect(resolveBookmarkOrganizerState(catalog, {
    selectedFolderId: '11',
    expandedFolderIds: ['11', 'missing'],
  })).toEqual({ selectedFolderId: '11', expandedFolderIds: ['11'] })
})

test('falls back safely when persisted values are malformed', () => {
  expect(resolveBookmarkOrganizerState(catalog, { selectedFolderId: 4 })).toEqual({
    selectedFolderId: '1',
    expandedFolderIds: ['1', '11', '111', '2'],
  })
})
