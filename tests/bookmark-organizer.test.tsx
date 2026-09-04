import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { BookmarkOrganizer } from '../src/components/bookmark-organizer'
import type { BrowserBookmarkCatalog } from '../src/lib/types'

const catalog: BrowserBookmarkCatalog = {
  folders: [
    {
      id: 'bar',
      title: '书签栏',
      index: 0,
      folderType: 'bookmarks-bar',
      unmodifiable: false,
      path: ['书签栏'],
      children: [],
      bookmarkCount: 1,
    },
  ],
  bookmarks: [
    {
      id: 'router',
      title: 'TanStack Router',
      url: 'https://tanstack.com/router',
      parentId: 'bar',
      index: 0,
      folderPath: '书签栏',
      unmodifiable: false,
    },
  ],
}

test('renders the two-pane bookmark organizer and its management controls', () => {
  const html = renderToStaticMarkup(
    <BookmarkOrganizer
      catalog={catalog}
      loading={false}
      onOpen={() => undefined}
      onUpdate={async () => undefined}
      onMove={async () => undefined}
      onImport={async () => 'imported'}
      onOpenManager={() => undefined}
    />,
  )

  expect(html).toContain('aria-label="书签文件夹"')
  expect(html).toContain('aria-label="书签列表"')
  expect(html).toContain('书签栏')
  expect(html).toContain('TanStack Router')
  expect(html).not.toContain('https://tanstack.com/router')
  expect(html).toContain('编辑书签')
  expect(html).toContain('移动到…')
  expect(html).toContain('导入 HTML')
  expect(html).toContain('导出 HTML')
  expect(html).toContain('Chrome 书签管理器')
})
