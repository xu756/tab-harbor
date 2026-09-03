import { createFileRoute } from '@tanstack/react-router'

import { Dashboard } from '../components/dashboard'
import { pathForView } from '../lib/app-routes'

export const Route = createFileRoute('/tabs')({
  component: TabsRoute,
})

function TabsRoute() {
  const navigate = Route.useNavigate()
  return <Dashboard view="tabs" onNavigate={(view) => navigate({ to: pathForView(view) })} />
}
