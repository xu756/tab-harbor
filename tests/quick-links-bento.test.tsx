import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { QuickLinksBento } from '../src/features/home/components/quick-links-bento'
import type { QuickLink } from '../src/lib/types'

const mockLinks: QuickLink[] = [
  { id: '1', title: 'GitHub', url: 'https://github.com', createdAt: Date.now() },
  { id: '2', title: 'Bilibili', url: 'https://bilibili.com', createdAt: Date.now() },
]

test('renders QuickLinksBento with site items and action trigger', () => {
  const html = renderToStaticMarkup(
    <QuickLinksBento
      links={mockLinks}
      onEdit={() => undefined}
      onRemove={() => undefined}
    />,
  )

  expect(html).toContain('快捷入口')
  expect(html).toContain('GitHub')
  expect(html).toContain('Bilibili')
  expect(html).toContain('添加')
})
