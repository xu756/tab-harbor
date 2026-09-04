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

export interface OmniSearchProps {
  onSearch?: (url: string) => void
  defaultEngine?: SearchEngineId
  onEngineChange?: (engine: SearchEngineId) => void
}

export function OmniSearch({ onSearch, defaultEngine, onEngineChange }: OmniSearchProps) {
  const [query, setQuery] = useState('')
  const [engine, setEngine] = useState<SearchEngineId>(() => {
    if (defaultEngine && SEARCH_ENGINES[defaultEngine]) return defaultEngine
    try {
      const saved = localStorage.getItem('harbor_search_engine') as SearchEngineId
      return saved && SEARCH_ENGINES[saved] ? saved : DEFAULT_SEARCH_ENGINE_ID
    } catch {
      return DEFAULT_SEARCH_ENGINE_ID
    }
  })

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (defaultEngine && SEARCH_ENGINES[defaultEngine]) {
      setEngine(defaultEngine)
    }
  }, [defaultEngine])

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
    onEngineChange?.(id)
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
