import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import * as dashboard from '../src/components/dashboard'

test('renders folder rows with accessible tree semantics', () => {
  expect('BookmarkTreeItem' in dashboard).toBe(true)
  const BookmarkTreeItem = (
    dashboard as typeof dashboard & {
      BookmarkTreeItem: (props: Record<string, unknown>) => React.ReactNode
    }
  ).BookmarkTreeItem

  const html = renderToStaticMarkup(
    <BookmarkTreeItem
      row={{
        kind: 'folder',
        id: 'folder:书签栏',
        label: '书签栏',
        depth: 0,
        folder: {
          kind: 'folder',
          id: 'folder:书签栏',
          name: '书签栏',
          path: ['书签栏'],
          depth: 0,
          folders: [],
          bookmarks: [],
          bookmarkCount: 12,
        },
        expanded: true,
        hasChildren: true,
      }}
      tabIndex={0}
      onActivate={() => {}}
      onFocus={() => {}}
      onKeyDown={() => {}}
      onOpenNewTab={() => {}}
    />,
  )

  expect(html).toContain('role="treeitem"')
  expect(html).toContain('aria-level="1"')
  expect(html).toContain('aria-expanded="true"')
  expect(html).toContain('书签栏')
  expect(html).toContain('12')
})
