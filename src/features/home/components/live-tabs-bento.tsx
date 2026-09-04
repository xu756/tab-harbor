import { Link } from '@tanstack/react-router'
import { ArrowRight, BookmarkPlus, SquareStack, X } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SiteIcon } from '@/features/shared/site-icon'
import { activateTab, closeTabs } from '@/lib/chrome'
import type { BrowserTab } from '@/lib/types'
import { cn } from '@/lib/utils'

interface LiveTabsBentoProps {
  tabs: BrowserTab[]
  onSaveWorkspace: () => void
  loading?: boolean
}

export function LiveTabsBento({ tabs, onSaveWorkspace, loading }: LiveTabsBentoProps) {
  const previewTabs = tabs.slice(0, 5)

  return (
    <Card className="rounded-2xl border-border/60 bg-card/75 backdrop-blur-md shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/25 flex flex-col justify-between">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 px-5 py-3.5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <SquareStack className="size-4 text-primary/80" />
          <span>活动标签</span>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground font-normal">
            {tabs.length}
          </span>
        </CardTitle>

        <Button
          variant="secondary"
          size="sm"
          onClick={onSaveWorkspace}
          className="h-7 gap-1 px-2.5 text-xs rounded-lg font-medium"
        >
          <BookmarkPlus className="size-3.5" />
          <span>保存为工作区</span>
        </Button>
      </CardHeader>

      <CardContent className="p-3 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-1.5">
          {loading ? (
            <div className="py-6 text-center text-xs text-muted-foreground">正在加载标签页…</div>
          ) : !tabs.length ? (
            <div className="py-6 text-center text-xs text-muted-foreground">当前窗口暂无活动标签</div>
          ) : (
            previewTabs.map((tab) => (
              <div
                key={tab.id}
                className={cn(
                  'group flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 transition-all text-xs',
                  tab.active
                    ? 'bg-primary/10 text-foreground font-medium'
                    : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground',
                )}
              >
                <button
                  type="button"
                  onClick={() => void activateTab(tab)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left truncate outline-none"
                >
                  <SiteIcon title={tab.title} url={tab.url} favIconUrl={tab.favIconUrl} />
                  <span className="truncate">{tab.title || '新标签页'}</span>
                </button>

                {tab.id && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      void closeTabs([tab.id!])
                    }}
                    className="size-5 rounded-md grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted hover:text-destructive"
                    aria-label="关闭标签"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border/40 pt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>共打开 {tabs.length} 个标签页</span>
          <Link
            to="/tabs"
            className={cn(buttonVariants({ variant: 'ghost', size: 'xs' }), 'gap-1 text-xs text-foreground')}
          >
            <span>管理全部标签</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
