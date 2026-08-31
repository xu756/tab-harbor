import { createFileRoute } from '@tanstack/react-router'
import { Dashboard } from '../components/dashboard'
import type { WorkspaceView } from '../lib/types'

interface DashboardSearch {
  view: WorkspaceView
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    view: search.view === 'workspaces' || search.view === 'devices' ? search.view : 'home',
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
