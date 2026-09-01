import { createFileRoute } from '@tanstack/react-router'
import { Dashboard } from '../components/dashboard'
import type { WorkspaceView } from '../lib/types'

interface DashboardSearch {
  view: WorkspaceView
}

const views: WorkspaceView[] = ['home', 'tabs', 'bookmarks', 'workspaces']

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    view: views.includes(search.view as WorkspaceView) ? (search.view as WorkspaceView) : 'home',
  }),
  component: DashboardRoute,
})

function DashboardRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <Dashboard
      view={search.view}
      onNavigate={(view) => navigate({ search: { view }, replace: true })}
    />
  )
}
