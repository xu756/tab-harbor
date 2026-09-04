import { expect, test } from 'bun:test'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { renderToStaticMarkup } from 'react-dom/server'
import { LiveTabsBento } from '../src/features/home/components/live-tabs-bento'
import { WorkspacesBento } from '../src/features/home/components/workspaces-bento'
import type { BrowserTab, Workspace } from '../src/lib/types'

async function renderWithRouter(component: React.ReactNode) {
  const rootRoute = createRootRoute({
    component: () => <>{component}</>,
  })
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  return renderToStaticMarkup(<RouterProvider router={router} />)
}

const mockTabs: BrowserTab[] = [
  { id: 1, windowId: 10, title: 'React 19 Docs', url: 'https://react.dev', active: true, pinned: false, incognito: false },
  { id: 2, windowId: 10, title: 'GitHub PR', url: 'https://github.com', active: false, pinned: false, incognito: false },
]

const mockWorkspaces: Workspace[] = [
  {
    id: 'w1',
    name: '开发环境',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tabs: [
      { id: 't1', title: 'Doc', url: 'https://doc.local', pinned: false, order: 0 },
      { id: 't2', title: 'Repo', url: 'https://github.com', pinned: false, order: 1 },
    ],
  },
]

test('renders LiveTabsBento with count and tab chips', async () => {
  const html = await renderWithRouter(
    <LiveTabsBento tabs={mockTabs} onSaveWorkspace={() => undefined} />,
  )
  expect(html).toContain('活动标签')
  expect(html).toContain('2')
  expect(html).toContain('React 19 Docs')
  expect(html).toContain('保存为工作区')
})

test('renders WorkspacesBento with saved collections', async () => {
  const html = await renderWithRouter(<WorkspacesBento workspaces={mockWorkspaces} />)
  expect(html).toContain('工作区快照')
  expect(html).toContain('开发环境')
  expect(html).toContain('恢复')
})
