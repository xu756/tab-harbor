import { FolderOpen } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useApp } from '@/features/app/app-provider'
import { PageHeading } from '@/features/shared/page-heading'
import { LiveTabs } from '@/features/tabs/live-tabs'

export function TabsPage() {
  const { tabs, loadingTabs, openSaveWorkspace } = useApp()
  return (
    <section className="space-y-7 px-5 py-8 sm:px-7 sm:py-10">
      <PageHeading
        eyebrow="Live tabs"
        title="标签"
        description="查看、搜索和整理当前所有窗口里的标签。"
        action={<Button size="lg" onClick={() => openSaveWorkspace(tabs)} disabled={!tabs.length}><FolderOpen data-icon="inline-start" />保存当前标签</Button>}
      />
      <LiveTabs tabs={tabs} loading={loadingTabs} onSave={openSaveWorkspace} />
    </section>
  )
}
