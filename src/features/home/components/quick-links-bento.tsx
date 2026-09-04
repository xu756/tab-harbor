import { ExternalLink, Globe2, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SiteIcon } from '@/features/shared/site-icon'
import { openUrl, openUrlInNewTab } from '@/lib/chrome'
import type { QuickLink } from '@/lib/types'

interface QuickLinksBentoProps {
  links: QuickLink[]
  onEdit: (link?: QuickLink) => void
  onRemove: (id: string) => void
}

export function QuickLinksBento({ links, onEdit, onRemove }: QuickLinksBentoProps) {
  return (
    <Card className="rounded-2xl border-border/60 bg-card/75 backdrop-blur-md shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/25">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 px-5 py-3.5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Globe2 className="size-4 text-primary/80" />
          <span>快捷入口</span>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground font-normal">
            {links.length}
          </span>
        </CardTitle>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onEdit()}
          className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
          aria-label="添加快捷入口"
        >
          <Plus className="size-4" />
        </Button>
      </CardHeader>

      <CardContent className="p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="group relative flex items-center justify-between rounded-xl border border-transparent bg-background/50 p-1.5 transition-all duration-200 hover:border-border/60 hover:bg-background/90 hover:shadow-sm"
            >
              <button
                type="button"
                onClick={() => void openUrl(link.url)}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1 text-left text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <SiteIcon title={link.title} url={link.url} fallback={link.label} />
                <span className="truncate">{link.title}</span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="size-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity rounded-md text-muted-foreground hover:text-foreground"
                      aria-label={`${link.title} 选项`}
                    />
                  }
                >
                  <MoreHorizontal className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => onEdit(link)} className="text-xs">
                      <Pencil className="size-3.5 mr-2" />
                      <span>编辑</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void openUrlInNewTab(link.url)} className="text-xs">
                      <ExternalLink className="size-3.5 mr-2" />
                      <span>新标签打开</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onRemove(link.id)}
                      className="text-xs"
                    >
                      <Trash2 className="size-3.5 mr-2" />
                      <span>删除</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}

          <button
            type="button"
            onClick={() => onEdit()}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 p-2.5 text-xs text-muted-foreground transition-all duration-200 hover:border-primary/50 hover:bg-muted/30 hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-3.5" />
            <span>添加快捷方式</span>
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
