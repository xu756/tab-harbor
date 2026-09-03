import { createFileRoute } from '@tanstack/react-router'

import { Dashboard } from '../components/dashboard'
import { pathForView } from '../lib/app-routes'

export const Route = createFileRoute('/bookmarks')({
  component: BookmarksRoute,
})

function BookmarksRoute() {
  const navigate = Route.useNavigate()
  return <Dashboard view="bookmarks" onNavigate={(view) => navigate({ to: pathForView(view) })} />
}
