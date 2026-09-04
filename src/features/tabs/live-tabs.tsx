import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { FolderOpen, Pin, Search, Volume2, X } from 'lucide-react'
import { useMemo, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { activateTab, closeTabs, hostnameFromUrl, normalizeUrl } from '@/lib/chrome'
import type { BrowserTab, TabGroupBucket } from '@/lib/types'
import { cn } from '@/lib/utils'
import { setSelectedTabIds, setTabSearch, toggleTabSelection, useUiStore } from '@/state/ui-store'
import { tabsQueryKey } from '@/features/app/app-provider'
import { SiteIcon } from '@/features/shared/site-icon'

type TabVirtualRow =
  | { kind: 'group'; key: string; group: TabGroupBucket }
  | { kind: 'tab'; key: string; tab: BrowserTab; group: TabGroupBucket }

function groupTabs(tabs: BrowserTab[]): TabGroupBucket[] {
  const buckets = new Map<string, TabGroupBucket>()
  for (const tab of tabs) {
    const nativeGroup = tab.groupId >= 0 && Boolean(tab.groupTitle)
    const title = nativeGroup ? tab.groupTitle! : hostnameFromUrl(tab.url)
    const key = nativeGroup ? `group:${tab.groupId}` : `domain:${title}`
    const current = buckets.get(key)
    if (current) current.tabs.push(tab)
    else buckets.set(key, { key, title, tabs: [tab], color: tab.groupColor })
  }
  return [...buckets.values()]
}

export function LiveTabs({ tabs, loading, onSave, compact = false }: {
  tabs: BrowserTab[]
  loading: boolean
  onSave: (tabs: BrowserTab[]) => void
  compact?: boolean
}) {
  const queryClient = useQueryClient()
  const search = useUiStore((state) => state.tabSearch)
  const selectedIds = useUiStore((state) => state.selectedTabIds)
  const scrollRef = useRef<HTMLDivElement>(null)
  const normalizedSearch = search.trim().toLowerCase()
  const visibleTabs = useMemo(
    () => tabs.filter((tab) => !normalizedSearch || `${tab.title} ${tab.url}`.toLowerCase().includes(normalizedSearch)),
    [normalizedSearch, tabs],
  )
  const groups = useMemo(() => groupTabs(visibleTabs), [visibleTabs])
  const rows = useMemo<TabVirtualRow[]>(() => groups.flatMap((group) => [
    { kind: 'group' as const, key: `header:${group.key}`, group },
    ...group.tabs.map((tab) => ({ kind: 'tab' as const, key: `tab:${tab.id}`, tab, group })),
  ]), [groups])
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => rows[index]?.kind === 'group' ? 38 : 44,
    overscan: 18,
  })
  const duplicateIds = useMemo(() => {
    const seen = new Set<string>()
    return tabs.flatMap((tab) => {
      const key = normalizeUrl(tab.url)
      if (seen.has(key)) return [tab.id]
      seen.add(key)
      return []
    })
  }, [tabs])
  const closeMutation = useMutation({
    mutationFn: closeTabs,
    onSuccess: async () => {
      setSelectedTabIds([])
      await queryClient.invalidateQueries({ queryKey: tabsQueryKey })
    },
  })

  return (
    <Card className="min-h-0 gap-0 py-0">
      <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">当前标签</p>
          <p className="mt-0.5 font-heading text-2xl font-semibold tracking-tight">{tabs.length}<span className="ml-1 text-sm font-normal text-muted-foreground">tabs</span></p>
        </div>
        <div className="flex items-center gap-1.5">
          {duplicateIds.length ? <Button variant="secondary" size="sm" onClick={() => setSelectedTabIds(duplicateIds)}>重复 {duplicateIds.length}</Button> : null}
          <Button variant="outline" size="sm" onClick={() => onSave(visibleTabs)} disabled={!visibleTabs.length}><FolderOpen data-icon="inline-start" />保存</Button>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 px-0">
        <div className="border-b p-3">
          <InputGroup>
            <InputGroupAddon><Search /></InputGroupAddon>
            <InputGroupInput value={search} onChange={(event) => setTabSearch(event.target.value)} placeholder="搜索标题、网址或站点" aria-label="搜索标签页" />
            {search ? <InputGroupAddon align="inline-end"><InputGroupButton size="icon-xs" onClick={() => setTabSearch('')} aria-label="清空搜索"><X /></InputGroupButton></InputGroupAddon> : null}
          </InputGroup>
          <div className="mt-2 flex justify-between px-0.5 text-xs text-muted-foreground"><span>{groups.length} 个分组</span><span>{selectedIds.length ? `已选 ${selectedIds.length}` : '勾选标签可批量处理'}</span></div>
        </div>

        <div ref={scrollRef} className={cn('overflow-auto', compact ? 'h-[min(54vh,540px)]' : 'h-[calc(100vh-295px)]')}>
          {loading ? <LoadingRows /> : null}
          {!loading && !rows.length ? (
            <Empty className="h-full border-0">
              <EmptyHeader><EmptyMedia variant="icon"><Search /></EmptyMedia><EmptyTitle>没有匹配的标签</EmptyTitle><EmptyDescription>换一个关键词试试。</EmptyDescription></EmptyHeader>
            </Empty>
          ) : null}
          {rows.length ? (
            <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index]
                if (!row) return null
                return (
                  <div key={row.key} className="absolute top-0 left-0 w-full" style={{ height: virtualRow.size, transform: `translateY(${virtualRow.start}px)` }}>
                    {row.kind === 'group'
                      ? <GroupRow group={row.group} onSave={() => onSave(row.group.tabs)} />
                      : <TabRow tab={row.tab} selected={selectedIds.includes(row.tab.id)} onClose={() => closeMutation.mutate([row.tab.id])} />}
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function GroupRow({ group, onSave }: { group: TabGroupBucket; onSave: () => void }) {
  return (
    <div className="flex h-full items-center gap-2 border-b bg-muted/45 px-4 text-xs text-muted-foreground">
      <span className="size-2 rounded-full bg-primary/45" data-color={group.color ?? 'neutral'} />
      <strong className="truncate font-medium text-foreground">{group.title}</strong>
      <span>{group.tabs.length}</span>
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon-xs" className="ml-auto" onClick={onSave} aria-label={`保存 ${group.title}`} />}><FolderOpen /></TooltipTrigger>
        <TooltipContent>保存这个分组</TooltipContent>
      </Tooltip>
    </div>
  )
}

function TabRow({ tab, selected, onClose }: { tab: BrowserTab; selected: boolean; onClose: () => void }) {
  return (
    <div className={cn('group flex h-full items-center gap-2 border-b px-4 transition-colors hover:bg-muted/55', tab.active && 'bg-primary/[0.035]', selected && 'bg-accent')}>
      <Checkbox checked={selected} onCheckedChange={() => toggleTabSelection(tab.id)} aria-label={selected ? `取消选择 ${tab.title}` : `选择 ${tab.title}`} />
      <Button variant="ghost" className="h-full min-w-0 flex-1 justify-start rounded-none px-1 hover:bg-transparent" onClick={() => void activateTab(tab)}>
        <SiteIcon title={tab.title} url={tab.url} src={tab.favIconUrl} />
        <span className="min-w-0 text-left leading-tight"><strong className="block truncate text-sm font-medium">{tab.title}</strong><span className="block truncate text-xs font-normal text-muted-foreground">{hostnameFromUrl(tab.url)}</span></span>
      </Button>
      <span className="flex items-center gap-1.5 text-muted-foreground">{tab.pinned ? <Pin className="size-3" /> : null}{tab.audible ? <Volume2 className="size-3" /> : null}</span>
      <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={`关闭 ${tab.title}`}><X /></Button>
    </div>
  )
}

function LoadingRows() {
  return <div className="space-y-2 p-4">{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="h-10 w-full" />)}</div>
}
