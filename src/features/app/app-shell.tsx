import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import {
  Bookmark,
  CircleUserRound,
  Cloud,
  Command,
  Layers3,
  LayoutGrid,
  Monitor,
  Moon,
  Settings,
  SquareStack,
  Sun,
  Waves,
} from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useApp } from '@/features/app/app-provider'
import { navigationItems } from '@/lib/app-routes'
import type { MockUserSession } from '@/lib/types'
import { cn } from '@/lib/utils'
import { cycleTheme, setCommandOpen, setSettingsOpen, useUiStore } from '@/state/ui-store'


const icons = {
  home: LayoutGrid,
  tabs: SquareStack,
  bookmarks: Bookmark,
  workspaces: Layers3,
}

export function AccountBadge({
  session,
  onClick,
}: {
  session: MockUserSession
  onClick: () => void
}) {
  if (session.isLoggedIn && session.user) {
    const initial = session.user.name?.slice(0, 1).toUpperCase() || 'U'
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              onClick={onClick}
              className="hidden h-8 gap-1.5 px-2.5 sm:flex rounded-xl font-normal text-xs"
              aria-label="打开账户与设置"
            >
              <span className="size-4.5 rounded-full bg-primary text-[0.62rem] text-primary-foreground font-semibold grid place-items-center shrink-0">
                {initial}
              </span>
              <span className="max-w-24 truncate font-medium text-foreground">
                {session.user.name}
              </span>
              <Cloud className="size-3 text-emerald-500 shrink-0" />
            </Button>
          }
        />
        <TooltipContent>已登录：{session.user.email} (点击打开设置)</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            onClick={onClick}
            className="hidden h-8 gap-1.5 px-2.5 sm:flex rounded-xl font-normal text-xs text-muted-foreground hover:text-foreground"
            aria-label="打开偏好设置与账户"
          >
            <CircleUserRound className="size-3.5" />
            <span>本地</span>
            <Settings className="size-3 opacity-60 ml-0.5" />
          </Button>
        }
      />
      <TooltipContent>偏好设置与数据管理 (⌘,)</TooltipContent>
    </Tooltip>
  )
}

export function AppShell() {
  const theme = useUiStore((state) => state.theme)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { session } = useApp()
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
            <AccountBadge session={session} onClick={() => setSettingsOpen(true)} />
          </div>
        </div>
      </header>


      <main key={pathname} className="mx-auto w-full max-w-[1560px] animate-in fade-in slide-in-from-bottom-1 duration-200 motion-reduce:animate-none">
        <Outlet />
      </main>
    </div>
  )
}
