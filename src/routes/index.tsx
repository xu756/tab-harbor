import { createFileRoute, redirect } from '@tanstack/react-router'
import { HomePage } from '@/features/home/home-page'
import { legacyViewPath } from '../lib/app-routes'

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
  component: HomePage,
})
