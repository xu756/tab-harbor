import { QueryClientProvider } from '@tanstack/react-query'
import {
  Outlet,
  createRootRouteWithContext,
} from '@tanstack/react-router'

import type { RouterContext } from '../router'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  const { queryClient } = Route.useRouteContext()

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  )
}