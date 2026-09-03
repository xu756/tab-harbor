import { QueryClient } from '@tanstack/react-query'
import { createHashHistory, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export interface RouterContext {
  queryClient: QueryClient
}

export function createAppHistory(browserWindow?: Window) {
  return createHashHistory(browserWindow ? { window: browserWindow } : undefined)
}

export function getRouter() {
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createAppHistory(),
    defaultPreload: 'intent',
    scrollRestoration: true,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
