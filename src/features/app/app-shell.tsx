import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import {
  Bookmark,
  CircleUserRound,
  Command,
  Layers3,
  LayoutGrid,
  Monitor,
  Moon,
  SquareStack,
  Sun,
  Waves,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { navigationItems } from '@/lib/app-routes'
import { cn } from '@/lib/utils'
import { cycleTheme, setCommandOpen, useUiStore } from '@/state/ui-store'

const icons = {
  home: LayoutGrid,
  tabs: SquareStack,
  bookmarks: Bookmark,
  workspaces: Layers3,
}

export function AppShell() {
  const theme = useUiStore((state) => state.theme)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/88 backdrop-blur-xl supports-backdrop-filter:bg-background/76">
        <div className="mx-auto grid min-h-16 max-w-[1560px] grid-cols-[1fr_auto_1fr] items-center gap-5 px-5 sm:px-7">
          <Link to="/" className="flex w-fit items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"><Waves className="size-4.5" /></span>
            <span className="hidden leading-none sm:grid sm:gap-1">
              <strong className="font-heading text-base tracking-tight">Harbor</strong>
              <span className="text-[0.68rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">Browser workspace</span>
            </span>
          </Link>

          <nav aria-label="主导航" className="flex items-center rounded-xl border bg-muted/45 p-1">
            {navigationItems.map((item) => {
              const Icon = icons[item.id]
              const active = pathname === item.to
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    'gap-1.5 px-2.5 text-muted-foreground hover:bg-background/70',
                    active && 'bg-background text-foreground shadow-sm hover:bg-background',
                  )}
                >
                  <Icon data-icon="inline-start" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center justify-end gap-1.5">
            <Button variant="outline" size="sm" className="hidden gap-2 lg:flex" onClick={() => setCommandOpen(true)}>
              <Command data-icon="inline-start" />搜索
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans text-[0.68rem] text-muted-foreground">⌘K</kbd>
            </Button>
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={cycleTheme} aria-label={`主题：${theme}`} />}>
                <ThemeIcon />
              </TooltipTrigger>
              <TooltipContent>切换主题：{theme}</TooltipContent>
            </Tooltip>
            <Badge variant="outline" className="hidden h-8 gap-1.5 px-2.5 sm:flex"><CircleUserRound />本地</Badge>
          </div>
        </div>
      </header>

      <main key={pathname} className="mx-auto w-full max-w-[1560px] animate-in fade-in slide-in-from-bottom-1 duration-200 motion-reduce:animate-none">
        <Outlet />
      </main>
    </div>
  )
}
