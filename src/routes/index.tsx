import { createFileRoute, redirect } from '@tanstack/react-router'
import { Dashboard } from '../components/dashboard'
import { legacyViewPath, pathForView } from '../lib/app-routes'

interface DashboardSearch {
  view?: string
  surface?: 'sidepanel'
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    view: typeof search.view === 'string' ? search.view : undefined,
    surface: search.surface === 'sidepanel' ? 'sidepanel' : undefined,
  }),
  beforeLoad: ({ search }) => {
    const to = legacyViewPath(search.view)
    if (to) throw redirect({ to, replace: true })
  },
  component: DashboardRoute,
})

function DashboardRoute() {
  const navigate = Route.useNavigate()

  return (
    <Dashboard
      view="home"
      onNavigate={(view) => navigate({ to: pathForView(view) })}
    />
  )
}
