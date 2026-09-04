# Bento-Style NewTab Reimplementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reimplement the Chrome NewTab page as an aesthetic, modern Bento Grid workspace using shadcn UI and glassmorphism styling, with zero legacy code baggage.

**Architecture:** Decompose the home page into focused, single-responsibility components (`HeroClock`, `OmniSearch`, `QuickLinksBento`, `LiveTabsBento`, `WorkspacesBento`, `DailyTodoBento`) and an orchestrating `HomePage`. Search engine preference and local data persist cleanly via Chrome storage and TanStack Query.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, shadcn UI (with Base UI primitives), TanStack Router, TanStack Query, Lucide icons, Bun.

## Global Constraints

- Manifest V3 CSP safe: no remote scripts, runtime CDN code, or unsafe evals.
- UI guardrails: compact rows, keyboard-accessible controls, frosted glassmorphism styling (`backdrop-blur-md bg-card/75 border-border/60`).
- No font sizes smaller than 12px via arbitrary classes (do not use `text-[9px]`, `text-[10px]`, `text-[11px]`).
- No Radix UI imports or `asChild` props; use Base UI `render` prop and shadcn UI components.
- Responsive breakpoints: 3/4-column Bento on desktop, 2-column on tablet, single-column on mobile and side-panel.

---

### Task 1: Search Engines & URL Resolver Utilities

**Files:**
- Create: `src/lib/search-engines.ts`
- Test: `tests/search-engines.test.ts`

**Interfaces:**
- Consumes: None
- Produces:
  - `type SearchEngineId = 'google' | 'baidu' | 'bing' | 'duckduckgo' | 'github'`
  - `interface SearchEngineConfig { id: SearchEngineId; name: string; icon: string; urlTemplate: string }`
  - `SEARCH_ENGINES: Record<SearchEngineId, SearchEngineConfig>`
  - `DEFAULT_SEARCH_ENGINE_ID: SearchEngineId = 'google'`
  - `resolveSearchOrUrl(input: string, engineId?: SearchEngineId): string`

- [ ] **Step 1: Write the failing test**

Create `tests/search-engines.test.ts`:
```typescript
import { expect, test } from 'bun:test'
import {
  DEFAULT_SEARCH_ENGINE_ID,
  SEARCH_ENGINES,
  resolveSearchOrUrl,
} from '../src/lib/search-engines'

test('defines supported search engines with valid URL templates', () => {
  expect(DEFAULT_SEARCH_ENGINE_ID).toBe('google')
  expect(SEARCH_ENGINES.google.urlTemplate).toContain('https://www.google.com/search?q=')
  expect(SEARCH_ENGINES.baidu.urlTemplate).toContain('https://www.baidu.com/s?wd=')
  expect(SEARCH_ENGINES.bing.urlTemplate).toContain('https://www.bing.com/search?q=')
  expect(SEARCH_ENGINES.duckduckgo.urlTemplate).toContain('https://duckduckgo.com/?q=')
  expect(SEARCH_ENGINES.github.urlTemplate).toContain('https://github.com/search?q=')
})

test('resolves direct URLs starting with http or https', () => {
  expect(resolveSearchOrUrl('https://example.com')).toBe('https://example.com')
  expect(resolveSearchOrUrl('http://localhost:3000')).toBe('http://localhost:3000')
})

test('resolves direct URLs with domain-like formatting', () => {
  expect(resolveSearchOrUrl('github.com/user/repo')).toBe('https://github.com/user/repo')
  expect(resolveSearchOrUrl('localhost:5173')).toBe('http://localhost:5173')
})

test('formats search query using specified or default search engine', () => {
  expect(resolveSearchOrUrl('shadcn ui')).toBe('https://www.google.com/search?q=shadcn%20ui')
  expect(resolveSearchOrUrl('react 19', 'github')).toBe('https://github.com/search?q=react%2019')
  expect(resolveSearchOrUrl('vite build', 'baidu')).toBe('https://www.baidu.com/s?wd=vite%20build')
  expect(resolveSearchOrUrl('bun test', 'bing')).toBe('https://www.bing.com/search?q=bun%20test')
  expect(resolveSearchOrUrl('antigravity', 'duckduckgo')).toBe('https://duckduckgo.com/?q=antigravity')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/search-engines.test.ts`
Expected: FAIL with "Cannot find module '../src/lib/search-engines'"

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/search-engines.ts`:
```typescript
export type SearchEngineId = 'google' | 'baidu' | 'bing' | 'duckduckgo' | 'github'

export interface SearchEngineConfig {
  id: SearchEngineId
  name: string
  urlTemplate: string
}

export const SEARCH_ENGINES: Record<SearchEngineId, SearchEngineConfig> = {
  google: {
    id: 'google',
    name: 'Google',
    urlTemplate: 'https://www.google.com/search?q=',
  },
  baidu: {
    id: 'baidu',
    name: '百度',
    urlTemplate: 'https://www.baidu.com/s?wd=',
  },
  bing: {
    id: 'bing',
    name: 'Bing',
    urlTemplate: 'https://www.bing.com/search?q=',
  },
  duckduckgo: {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    urlTemplate: 'https://duckduckgo.com/?q=',
  },
  github: {
    id: 'github',
    name: 'GitHub',
    urlTemplate: 'https://github.com/search?q=',
  },
}

export const DEFAULT_SEARCH_ENGINE_ID: SearchEngineId = 'google'

export function isUrl(input: string): boolean {
  const trimmed = input.trim()
  if (/^https?:\/\//i.test(trimmed)) return true
  if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmed)) return true
  return /^[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(trimmed)
}

export function resolveSearchOrUrl(input: string, engineId: SearchEngineId = DEFAULT_SEARCH_ENGINE_ID): string {
  const trimmed = input.trim()
  if (!trimmed) return ''

  if (isUrl(trimmed)) {
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed
    }
    if (/^localhost/i.test(trimmed)) {
      return `http://${trimmed}`
    }
    return `https://${trimmed}`
  }

  const engine = SEARCH_ENGINES[engineId] ?? SEARCH_ENGINES[DEFAULT_SEARCH_ENGINE_ID]
  return `${engine.urlTemplate}${encodeURIComponent(trimmed)}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/search-engines.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/search-engines.ts tests/search-engines.test.ts
git commit -m "feat(search): add search engines and URL resolution utilities"
```

---

### Task 2: Hero Section Components (`HeroClock` & `OmniSearch`)

**Files:**
- Create: `src/features/home/components/hero-clock.tsx`
- Create: `src/features/home/components/omni-search.tsx`
- Test: `tests/hero-components.test.tsx`

**Interfaces:**
- Consumes:
  - `src/lib/search-engines.ts` (`SEARCH_ENGINES`, `SearchEngineId`, `resolveSearchOrUrl`)
  - `src/lib/chrome.ts` (`openUrl`)
- Produces:
  - `HeroClock({ showSeconds?: boolean })`
  - `OmniSearch({ onSearch?: (url: string) => void })`

- [ ] **Step 1: Write the failing test**

Create `tests/hero-components.test.tsx`:
```typescript
import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { HeroClock } from '../src/features/home/components/hero-clock'
import { OmniSearch } from '../src/features/home/components/omni-search'

test('renders HeroClock with localized date and time display', () => {
  const html = renderToStaticMarkup(<HeroClock fixedDate={new Date('2026-09-04T10:30:00')} />)
  expect(html).toContain('10:30')
  expect(html).toContain('早上好')
  expect(html).toContain('9月4日')
})

test('renders OmniSearch with search input and engine selection', () => {
  const html = renderToStaticMarkup(<OmniSearch />)
  expect(html).toContain('placeholder="搜索网页或输入网址…"')
  expect(html).toContain('Google')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/hero-components.test.tsx`
Expected: FAIL with "Cannot find module '../src/features/home/components/hero-clock'"

- [ ] **Step 3: Write minimal implementation**

Create `src/features/home/components/hero-clock.tsx`:
```typescript
import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

export function getGreeting(hour: number): string {
  if (hour < 6) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export function HeroClock({ fixedDate }: { fixedDate?: Date }) {
  const [now, setNow] = useState(() => fixedDate ?? new Date())

  useEffect(() => {
    if (fixedDate) return
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [fixedDate])

  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const dateStr = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(now)

  const greeting = getGreeting(now.getHours())

  return (
    <div className="flex flex-col items-center justify-center text-center select-none py-2 sm:py-4">
      <div className="font-heading text-5xl sm:text-7xl lg:text-8xl font-semibold tracking-tight text-foreground/90 tabular-nums">
        <span>{hours}</span>
        <span className="animate-pulse text-muted-foreground/60">:</span>
        <span>{minutes}</span>
        <span className="hidden sm:inline text-3xl sm:text-4xl text-muted-foreground/50 font-normal ml-2">
          :{seconds}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 text-sm sm:text-base font-medium text-muted-foreground">
        <span>{dateStr}</span>
        <span className="text-border">•</span>
        <span className="text-foreground/80 font-medium">{greeting}</span>
        <span className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground/80 ml-1">
          <Sparkles className="size-3 text-primary/70" />
          <span>静享专注时光</span>
        </span>
      </div>
    </div>
  )
}
```

Create `src/features/home/components/omni-search.tsx`:
```typescript
import { ArrowUpRight, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { openUrl } from '@/lib/chrome'
import {
  DEFAULT_SEARCH_ENGINE_ID,
  SEARCH_ENGINES,
  type SearchEngineId,
  resolveSearchOrUrl,
} from '@/lib/search-engines'

export function OmniSearch({ onSearch }: { onSearch?: (url: string) => void }) {
  const [query, setQuery] = useState('')
  const [engine, setEngine] = useState<SearchEngineId>(() => {
    try {
      const saved = localStorage.getItem('harbor_search_engine') as SearchEngineId
      return saved && SEARCH_ENGINES[saved] ? saved : DEFAULT_SEARCH_ENGINE_ID
    } catch {
      return DEFAULT_SEARCH_ENGINE_ID
    }
  })

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const selectEngine = (id: SearchEngineId) => {
    setEngine(id)
    try {
      localStorage.setItem('harbor_search_engine', id)
    } catch {
      // safe fallback
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    const targetUrl = resolveSearchOrUrl(trimmed, engine)
    if (onSearch) {
      onSearch(targetUrl)
    } else {
      void openUrl(targetUrl)
    }
  }

  const currentEngine = SEARCH_ENGINES[engine]

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form
        onSubmit={handleSubmit}
        className="group relative flex items-center h-13 sm:h-14 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/70 shadow-sm transition-all duration-200 focus-within:border-primary/40 focus-within:shadow-md focus-within:ring-3 focus-within:ring-primary/10 px-2"
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 px-2.5 font-medium text-xs text-muted-foreground hover:text-foreground rounded-xl"
              />
            }
          >
            <span>{currentEngine.name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-32">
            {Object.values(SEARCH_ENGINES).map((item) => (
              <DropdownMenuItem
                key={item.id}
                onClick={() => selectEngine(item.id)}
                className="justify-between text-xs"
              >
                <span>{item.name}</span>
                {item.id === engine && <span className="size-1.5 rounded-full bg-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-4 w-px bg-border/60 mx-1" />

        <Search className="size-4.5 text-muted-foreground/70 ml-1.5 shrink-0" />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索网页或输入网址…"
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm sm:text-base text-foreground placeholder:text-muted-foreground/60 outline-none"
        />

        {query.trim() ? (
          <Button
            type="submit"
            size="icon-xs"
            variant="secondary"
            className="size-8 rounded-xl shrink-0"
            aria-label="前往"
          >
            <ArrowUpRight className="size-4" />
          </Button>
        ) : (
          <kbd className="hidden sm:inline-flex items-center justify-center rounded-lg border border-border/60 bg-muted/40 px-1.5 py-0.5 font-sans text-xs text-muted-foreground/70 mr-1">
            /
          </kbd>
        )}
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/hero-components.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/home/components/hero-clock.tsx src/features/home/components/omni-search.tsx tests/hero-components.test.tsx
git commit -m "feat(home): add HeroClock and OmniSearch bento components"
```

---

### Task 3: Quick Links Bento Component (`QuickLinksBento`)

**Files:**
- Create: `src/features/home/components/quick-links-bento.tsx`
- Test: `tests/quick-links-bento.test.tsx`

**Interfaces:**
- Consumes:
  - `src/features/shared/site-icon.tsx` (`SiteIcon`)
  - `src/lib/types.ts` (`QuickLink`)
  - `src/lib/chrome.ts` (`openUrl`, `openUrlInNewTab`)
- Produces:
  - `QuickLinksBento({ links: QuickLink[], onEdit: (link?: QuickLink) => void, onRemove: (id: string) => void })`

- [ ] **Step 1: Write the failing test**

Create `tests/quick-links-bento.test.tsx`:
```typescript
import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { QuickLinksBento } from '../src/features/home/components/quick-links-bento'
import type { QuickLink } from '../src/lib/types'

const mockLinks: QuickLink[] = [
  { id: '1', title: 'GitHub', url: 'https://github.com', createdAt: Date.now() },
  { id: '2', title: 'Bilibili', url: 'https://bilibili.com', createdAt: Date.now() },
]

test('renders QuickLinksBento with site items and action trigger', () => {
  const html = renderToStaticMarkup(
    <QuickLinksBento
      links={mockLinks}
      onEdit={() => undefined}
      onRemove={() => undefined}
    />,
  )

  expect(html).toContain('快捷入口')
  expect(html).toContain('GitHub')
  expect(html).toContain('Bilibili')
  expect(html).toContain('添加')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/quick-links-bento.test.tsx`
Expected: FAIL with "Cannot find module '../src/features/home/components/quick-links-bento'"

- [ ] **Step 3: Write minimal implementation**

Create `src/features/home/components/quick-links-bento.tsx`:
```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/quick-links-bento.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/home/components/quick-links-bento.tsx tests/quick-links-bento.test.tsx
git commit -m "feat(home): add QuickLinksBento component"
```

---

### Task 4: Live Tabs & Workspaces Bento Components (`LiveTabsBento`, `WorkspacesBento`)

**Files:**
- Create: `src/features/home/components/live-tabs-bento.tsx`
- Create: `src/features/home/components/workspaces-bento.tsx`
- Test: `tests/tabs-workspaces-bento.test.tsx`

**Interfaces:**
- Consumes:
  - `src/lib/types.ts` (`BrowserTab`, `WorkspaceItem`)
  - `src/features/shared/site-icon.tsx` (`SiteIcon`)
  - `src/lib/chrome.ts` (`activateTab`, `closeTab`, `restoreUrls`)
- Produces:
  - `LiveTabsBento({ tabs: BrowserTab[], onSaveWorkspace: () => void, loading?: boolean })`
  - `WorkspacesBento({ workspaces: WorkspaceItem[] })`

- [ ] **Step 1: Write the failing test**

Create `tests/tabs-workspaces-bento.test.tsx`:
```typescript
import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { LiveTabsBento } from '../src/features/home/components/live-tabs-bento'
import { WorkspacesBento } from '../src/features/home/components/workspaces-bento'
import type { BrowserTab, WorkspaceItem } from '../src/lib/types'

const mockTabs: BrowserTab[] = [
  { id: 1, windowId: 10, title: 'React 19 Docs', url: 'https://react.dev', active: true, pinned: false, incognito: false },
  { id: 2, windowId: 10, title: 'GitHub PR', url: 'https://github.com', active: false, pinned: false, incognito: false },
]

const mockWorkspaces: WorkspaceItem[] = [
  {
    id: 'w1',
    name: '开发环境',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tabs: [
      { title: 'Doc', url: 'https://doc.local' },
      { title: 'Repo', url: 'https://github.com' },
    ],
  },
]

test('renders LiveTabsBento with count and tab chips', () => {
  const html = renderToStaticMarkup(
    <LiveTabsBento tabs={mockTabs} onSaveWorkspace={() => undefined} />,
  )
  expect(html).toContain('活动标签')
  expect(html).toContain('2')
  expect(html).toContain('React 19 Docs')
  expect(html).toContain('保存为工作区')
})

test('renders WorkspacesBento with saved collections', () => {
  const html = renderToStaticMarkup(<WorkspacesBento workspaces={mockWorkspaces} />)
  expect(html).toContain('工作区快照')
  expect(html).toContain('开发环境')
  expect(html).toContain('恢复')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/tabs-workspaces-bento.test.tsx`
Expected: FAIL with "Cannot find module '../src/features/home/components/live-tabs-bento'"

- [ ] **Step 3: Write minimal implementation**

Create `src/features/home/components/live-tabs-bento.tsx`:
```typescript
import { Link } from '@tanstack/react-router'
import { ArrowRight, BookmarkPlus, Layers, SquareStack, X } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SiteIcon } from '@/features/shared/site-icon'
import { activateTab, closeTab } from '@/lib/chrome'
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
                  tab.active ? 'bg-primary/10 text-foreground font-medium' : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground',
                )}
              >
                <button
                  type="button"
                  onClick={() => tab.id && void activateTab(tab.id, tab.windowId)}
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
                      void closeTab(tab.id!)
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
```

Create `src/features/home/components/workspaces-bento.tsx`:
```typescript
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
                    <span className="rounded-md bg-muted px-1.5 py-0.2 text-[0.68rem] text-muted-foreground">
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/tabs-workspaces-bento.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/home/components/live-tabs-bento.tsx src/features/home/components/workspaces-bento.tsx tests/tabs-workspaces-bento.test.tsx
git commit -m "feat(home): add LiveTabsBento and WorkspacesBento components"
```

---

### Task 5: Daily Todo Bento Component (`DailyTodoBento`)

**Files:**
- Create: `src/features/home/components/daily-todo-bento.tsx`
- Test: `tests/daily-todo-bento.test.tsx`

**Interfaces:**
- Consumes:
  - `src/lib/types.ts` (`TodoItem`)
- Produces:
  - `DailyTodoBento({ todos: TodoItem[], onCreate: (text: string) => void, onToggle: (id: string, completed: boolean) => void, onRemove: (id: string) => void, onClearCompleted: () => void })`

- [ ] **Step 1: Write the failing test**

Create `tests/daily-todo-bento.test.tsx`:
```typescript
import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { DailyTodoBento } from '../src/features/home/components/daily-todo-bento'
import type { TodoItem } from '../src/lib/types'

const mockTodos: TodoItem[] = [
  { id: '1', text: '完成 Bento 页面开发', completed: true, createdAt: Date.now() },
  { id: '2', text: '运行单元测试', completed: false, createdAt: Date.now() },
]

test('renders DailyTodoBento with progress and task items', () => {
  const html = renderToStaticMarkup(
    <DailyTodoBento
      todos={mockTodos}
      onCreate={() => undefined}
      onToggle={() => undefined}
      onRemove={() => undefined}
      onClearCompleted={() => undefined}
    />,
  )

  expect(html).toContain('今日待办')
  expect(html).toContain('1 / 2 已完成')
  expect(html).toContain('完成 Bento 页面开发')
  expect(html).toContain('运行单元测试')
  expect(html).toContain('清理已完成')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/daily-todo-bento.test.tsx`
Expected: FAIL with "Cannot find module '../src/features/home/components/daily-todo-bento'"

- [ ] **Step 3: Write minimal implementation**

Create `src/features/home/components/daily-todo-bento.tsx`:
```typescript
import { CheckCircle2, ListTodo, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import type { TodoItem } from '@/lib/types'
import { cn } from '@/lib/utils'

interface DailyTodoBentoProps {
  todos: TodoItem[]
  onCreate: (text: string) => void
  onToggle: (id: string, completed: boolean) => void
  onRemove: (id: string) => void
  onClearCompleted: () => void
}

export function DailyTodoBento({
  todos,
  onCreate,
  onToggle,
  onRemove,
  onClearCompleted,
}: DailyTodoBentoProps) {
  const [inputText, setInputText] = useState('')

  const completedCount = todos.filter((t) => t.completed).length

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputText.trim()
    if (!trimmed) return
    onCreate(trimmed)
    setInputText('')
  }

  return (
    <Card className="rounded-2xl border-border/60 bg-card/75 backdrop-blur-md shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/25 flex flex-col justify-between">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 px-5 py-3.5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ListTodo className="size-4 text-primary/80" />
          <span>今日待办</span>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground font-normal">
            {completedCount} / {todos.length} 已完成
          </span>
        </CardTitle>

        {completedCount > 0 && (
          <Button
            variant="ghost"
            size="xs"
            onClick={onClearCompleted}
            className="h-6 text-xs text-muted-foreground hover:text-foreground"
          >
            <span>清理已完成</span>
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-3 flex-1 flex flex-col justify-between gap-3">
        <form onSubmit={handleSubmit} className="flex gap-1.5">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="添加一件专注小事…"
            className="h-8 text-xs rounded-xl bg-background/50 border-border/50"
          />
          <Button
            type="submit"
            size="icon-xs"
            variant="secondary"
            className="size-8 rounded-xl shrink-0"
            aria-label="添加待办"
          >
            <Plus className="size-3.5" />
          </Button>
        </form>

        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {!todos.length ? (
            <div className="py-5 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5">
              <CheckCircle2 className="size-5 text-muted-foreground/40" />
              <span>今日还没有待办，随手记一件吧</span>
            </div>
          ) : (
            todos.slice(0, 6).map((todo) => (
              <div
                key={todo.id}
                className="group flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted/60"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => onToggle(todo.id, !todo.completed)}
                    aria-label={todo.completed ? '标记未完成' : '标记完成'}
                  />
                  <span
                    className={cn(
                      'text-xs truncate transition-all',
                      todo.completed ? 'text-muted-foreground/70 line-through' : 'text-foreground',
                    )}
                  >
                    {todo.text}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onRemove(todo.id)}
                  className="size-5 rounded-md grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted hover:text-destructive"
                  aria-label="删除待办"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border/40 pt-2 text-[0.68rem] text-muted-foreground text-center">
          随时记下今日专注，完成打勾心无旁骛
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/daily-todo-bento.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/home/components/daily-todo-bento.tsx tests/daily-todo-bento.test.tsx
git commit -m "feat(home): add DailyTodoBento component"
```

---

### Task 6: Bento Home Page Orchestrator & Glassmorphic AppShell

**Files:**
- Modify: `src/features/home/home-page.tsx`
- Modify: `src/features/app/app-shell.tsx`
- Test: `tests/home-bento.test.tsx`

**Interfaces:**
- Consumes:
  - `HeroClock`, `OmniSearch`, `QuickLinksBento`, `LiveTabsBento`, `WorkspacesBento`, `DailyTodoBento`
  - `useApp`, `useMutation`, `useQueryClient`
- Produces:
  - `HomePage()` default view for route `/`

- [ ] **Step 1: Write the failing test**

Create `tests/home-bento.test.tsx`:
```typescript
import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

test('HomePage uses modular bento components and avoids legacy dashboard presentation', () => {
  const homeContent = readFileSync('src/features/home/home-page.tsx', 'utf8')
  expect(homeContent).toContain('HeroClock')
  expect(homeContent).toContain('OmniSearch')
  expect(homeContent).toContain('QuickLinksBento')
  expect(homeContent).toContain('LiveTabsBento')
  expect(homeContent).toContain('WorkspacesBento')
  expect(homeContent).toContain('DailyTodoBento')
  expect(homeContent).not.toMatch(/components\/dashboard|primary-button|secondary-button/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/home-bento.test.tsx`
Expected: FAIL with "expect(homeContent).toContain('HeroClock')"

- [ ] **Step 3: Write minimal implementation**

Rewrite `src/features/home/home-page.tsx`:
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useApp, quickLinksQueryKey, todosQueryKey } from '@/features/app/app-provider'
import { DailyTodoBento } from '@/features/home/components/daily-todo-bento'
import { HeroClock } from '@/features/home/components/hero-clock'
import { LiveTabsBento } from '@/features/home/components/live-tabs-bento'
import { OmniSearch } from '@/features/home/components/omni-search'
import { QuickLinksBento } from '@/features/home/components/quick-links-bento'
import { WorkspacesBento } from '@/features/home/components/workspaces-bento'
import {
  clearCompletedTodos,
  createTodo,
  removeQuickLink,
  removeTodo,
  updateTodo,
} from '@/lib/storage'

export function HomePage() {
  const {
    tabs,
    workspaces,
    quickLinks,
    todos,
    loadingTabs,
    openSaveWorkspace,
    openQuickLinkEditor,
  } = useApp()

  const queryClient = useQueryClient()

  const removeQuickLinkMutation = useMutation({
    mutationFn: removeQuickLink,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quickLinksQueryKey }),
  })

  const createTodoMutation = useMutation({
    mutationFn: createTodo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todosQueryKey }),
  })

  const updateTodoMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { completed: boolean } }) =>
      updateTodo(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todosQueryKey }),
  })

  const removeTodoMutation = useMutation({
    mutationFn: removeTodo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todosQueryKey }),
  })

  const clearCompletedTodosMutation = useMutation({
    mutationFn: clearCompletedTodos,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todosQueryKey }),
  })

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 space-y-8 sm:space-y-10 animate-in fade-in duration-300">
      <HeroClock />

      <OmniSearch />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        <QuickLinksBento
          links={quickLinks}
          onEdit={openQuickLinkEditor}
          onRemove={(id) => removeQuickLinkMutation.mutate(id)}
        />

        <LiveTabsBento
          tabs={tabs}
          loading={loadingTabs}
          onSaveWorkspace={openSaveWorkspace}
        />

        <WorkspacesBento workspaces={workspaces} />

        <DailyTodoBento
          todos={todos}
          onCreate={(text) => createTodoMutation.mutate(text)}
          onToggle={(id, completed) => updateTodoMutation.mutate({ id, patch: { completed } })}
          onRemove={(id) => removeTodoMutation.mutate(id)}
          onClearCompleted={() => clearCompletedTodosMutation.mutate()}
        />
      </div>
    </div>
  )
}
```

Update `src/features/app/app-shell.tsx` to enhance the floating glass header with `backdrop-blur-xl bg-background/70 border-b border-border/50`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test`
Expected: ALL PASS

- [ ] **Step 5: Run typecheck and build**

Run: `bun run typecheck && bun run build`
Expected: Zero TypeScript errors, production build completes in `dist/`.

- [ ] **Step 6: Commit**

```bash
git add src/features/home/home-page.tsx src/features/app/app-shell.tsx tests/home-bento.test.tsx
git commit -m "feat(home): reimplement HomePage with modern bento glassmorphism architecture"
```
