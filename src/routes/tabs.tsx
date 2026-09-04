import { createFileRoute } from '@tanstack/react-router'

import { TabsPage } from '@/features/tabs/tabs-page'

export const Route = createFileRoute('/tabs')({
  component: TabsPage,
})
