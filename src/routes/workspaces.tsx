import { createFileRoute } from '@tanstack/react-router'

import { Dashboard } from '../components/dashboard'
import { pathForView } from '../lib/app-routes'

export const Route = createFileRoute('/workspaces')({
  component: WorkspacesRoute,
})

function WorkspacesRoute() {
  const navigate = Route.useNavigate()
  return <Dashboard view="workspaces" onNavigate={(view) => navigate({ to: pathForView(view) })} />
}
