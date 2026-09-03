import { QueryClientProvider } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
} from '@tanstack/react-router'

import { AppProvider } from '@/features/app/app-provider'
import { AppShell } from '@/features/app/app-shell'
import type { RouterContext } from '../router'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  const { queryClient } = Route.useRouteContext()

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </QueryClientProvider>
  )
}
