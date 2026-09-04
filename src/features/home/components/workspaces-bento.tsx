import { Link } from '@tanstack/react-router'
import { ArrowRight, Layers3, Play } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SiteIcon } from '@/features/shared/site-icon'
import { restoreUrls } from '@/lib/chrome'
import type { WorkspaceItem } from '@/lib/types'
import { cn } from '@/lib/utils'

interface WorkspacesBentoProps {
  workspaces: WorkspaceItem[]
}

export function WorkspacesBento({ workspaces }: WorkspacesBentoProps) {
  const recentWorkspaces = workspaces.slice(0, 3)

  return (
    <Card className="rounded-2xl border-border/60 bg-card/75 backdrop-blur-md shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/25 flex flex-col justify-between">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 px-5 py-3.5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Layers3 className="size-4 text-primary/80" />
          <span>工作区快照</span>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground font-normal">
            {workspaces.length}
          </span>
        </CardTitle>
        <Link
          to="/workspaces"
          className={cn(buttonVariants({ variant: 'ghost', size: 'xs' }), 'gap-1 text-xs text-muted-foreground hover:text-foreground')}
        >
          <span>查看全部</span>
          <ArrowRight className="size-3" />
        </Link>
      </CardHeader>

      <CardContent className="p-3 flex-1 flex flex-col justify-between gap-2">
        {!workspaces.length ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            保存一组标签页后，会在这里显示为工作区
          </div>
        ) : (
          <div className="space-y-2">
            {recentWorkspaces.map((ws) => (
              <div
                key={ws.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/50 p-2.5 transition-all hover:bg-background/80 hover:shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <strong className="truncate text-xs font-semibold text-foreground">
                      {ws.name}
                    </strong>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[0.68rem] text-muted-foreground">
                      {ws.tabs.length} 页面
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center gap-1 overflow-hidden">
                    {ws.tabs.slice(0, 4).map((t, idx) => (
                      <SiteIcon key={idx} title={t.title} url={t.url} className="size-3.5" />
                    ))}
                    {ws.tabs.length > 4 && (
                      <span className="text-[0.68rem] text-muted-foreground">+{ws.tabs.length - 4}</span>
                    )}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => void restoreUrls(ws.tabs.map((t) => t.url))}
                  className="h-7 gap-1 px-2 text-xs rounded-lg font-medium"
                >
                  <Play className="size-3 text-primary" />
                  <span>恢复</span>
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-border/40 pt-2 text-[0.68rem] text-muted-foreground text-center">
          一键恢复整组工作页面，告别繁琐标签寻找
        </div>
      </CardContent>
    </Card>
  )
}
