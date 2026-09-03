import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Bookmark,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Command,
  ExternalLink,
  Folder,
  FolderOpen,
  Globe2,
  LayoutGrid,
  Layers3,
  ListTodo,
  MoreHorizontal,
  Moon,
  Pencil,
  Pin,
  Plus,
  Search,
  Sparkles,
  SquareStack,
  Sun,
  Trash2,
  Volume2,
  Waves,
  X,
  Monitor,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import {
  activateTab,
  closeTabs,
  faviconUrlForPage,
  hostnameFromUrl,
  normalizeUrl,
  openBookmarksManager,
  openUrl,
  openUrlInNewTab,
  queryBookmarks,
  queryLiveTabs,
  restoreUrls,
  subscribeToBookmarkChanges,
  subscribeToTabChanges,
} from '../lib/chrome'
import {
  clearCompletedTodos,
  createTodo,
  createWorkspace,
  listQuickLinks,
  listTodos,
  listWorkspaces,
  removeQuickLink,
  removeTodo,
  removeWorkspace,
  renameWorkspace,
  saveQuickLink,
  updateTodo,
} from '../lib/storage'
import {
  buildBookmarkTree,
  flattenBookmarkTree,
  getBookmarkTreeKeyAction,
  getInitialExpandedFolderIds,
  parseExpandedFolderIds,
} from '../lib/bookmark-tree'
import type { BookmarkTreeRow } from '../lib/bookmark-tree'
import type {
  BrowserBookmark,
  BrowserTab,
  QuickLink,
  TabGroupBucket,
  TodoItem,
  Workspace,
  WorkspaceView,
} from '../lib/types'
import {
  cycleTheme,
  setCommandOpen,
  setSelectedTabIds,
  setTabSearch,
  toggleTabSelection,
  useUiStore,
} from '../state/ui-store'

const TABS_QUERY_KEY = ['live-tabs'] as const
const BOOKMARKS_QUERY_KEY = ['bookmarks'] as const
const WORKSPACES_QUERY_KEY = ['workspaces'] as const
const QUICK_LINKS_QUERY_KEY = ['quick-links'] as const
const TODOS_QUERY_KEY = ['todos'] as const
const BOOKMARK_EXPANSION_KEY = 'harbor.bookmarks.expanded'

type TabVirtualRow =
  | { kind: 'group'; key: string; group: TabGroupBucket }
  | { kind: 'tab'; key: string; tab: BrowserTab; group: TabGroupBucket }

interface DashboardProps {
  view: WorkspaceView
  onNavigate: (view: WorkspaceView) => void
}

interface QuickLinkDraft {
  id?: string
  title: string
  url: string
  label: string
}

export function Dashboard({ view, onNavigate }: DashboardProps) {
  const queryClient = useQueryClient()
  const selectedTabIds = useUiStore((state) => state.selectedTabIds)
  const commandOpen = useUiStore((state) => state.commandOpen)
  const theme = useUiStore((state) => state.theme)
  const [saveCandidate, setSaveCandidate] = useState<BrowserTab[] | null>(null)
  const [quickLinkDraft, setQuickLinkDraft] = useState<QuickLinkDraft | null>(null)
  const [renameTarget, setRenameTarget] = useState<Workspace | null>(null)

  const tabsQuery = useQuery({ queryKey: TABS_QUERY_KEY, queryFn: queryLiveTabs })
  const bookmarksQuery = useQuery({ queryKey: BOOKMARKS_QUERY_KEY, queryFn: queryBookmarks })
  const workspacesQuery = useQuery({ queryKey: WORKSPACES_QUERY_KEY, queryFn: listWorkspaces })
  const quickLinksQuery = useQuery({ queryKey: QUICK_LINKS_QUERY_KEY, queryFn: listQuickLinks })
  const todosQuery = useQuery({ queryKey: TODOS_QUERY_KEY, queryFn: listTodos })

  useEffect(() => subscribeToTabChanges(() => void queryClient.invalidateQueries({ queryKey: TABS_QUERY_KEY })), [queryClient])
  useEffect(() => subscribeToBookmarkChanges(() => void queryClient.invalidateQueries({ queryKey: BOOKMARKS_QUERY_KEY })), [queryClient])

  useEffect(() => {
    if (theme === 'system') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(!commandOpen)
      }
      if (event.key === 'Escape' && commandOpen) setCommandOpen(false)
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [commandOpen])

  const tabs = tabsQuery.data ?? []
  const bookmarks = bookmarksQuery.data ?? []
  const workspaces = workspacesQuery.data ?? []
  const quickLinks = quickLinksQuery.data ?? []
  const todos = todosQuery.data ?? []
  const selectedTabs = tabs.filter((tab) => selectedTabIds.includes(tab.id))

  const openQuickLinkEditor = (link?: QuickLink) => {
    setQuickLinkDraft(
      link
        ? { id: link.id, title: link.title, url: link.url, label: link.label }
        : { title: '', url: '', label: '' },
    )
  }

  return (
    <div className="app-shell">
      <Header view={view} onNavigate={onNavigate} theme={theme} />

      <main className="page-shell">
        {view === 'home' ? (
          <HomeView
            tabs={tabs}
            workspaces={workspaces}
            quickLinks={quickLinks}
            todos={todos}
            loadingTabs={tabsQuery.isLoading}
            onNavigate={onNavigate}
            onSave={setSaveCandidate}
            onEditQuickLink={openQuickLinkEditor}
          />
        ) : null}
        {view === 'tabs' ? (
          <TabsView tabs={tabs} loading={tabsQuery.isLoading} onSave={setSaveCandidate} />
        ) : null}
        {view === 'bookmarks' ? (
          <BookmarksView bookmarks={bookmarks} loading={bookmarksQuery.isLoading} />
        ) : null}
        {view === 'workspaces' ? (
          <WorkspacesView
            tabs={tabs}
            workspaces={workspaces}
            onSave={setSaveCandidate}
            onRename={setRenameTarget}
          />
        ) : null}
      </main>

      {selectedTabs.length > 0 ? (
        <SelectionBar tabs={selectedTabs} onSave={() => setSaveCandidate(selectedTabs)} onDone={() => setSelectedTabIds([])} />
      ) : null}

      {saveCandidate ? (
        <SaveWorkspaceDialog
          tabs={saveCandidate}
          onClose={() => setSaveCandidate(null)}
          onSaved={async () => {
            setSaveCandidate(null)
            setSelectedTabIds([])
            await queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY })
          }}
        />
      ) : null}

      {quickLinkDraft ? (
        <QuickLinkDialog
          key={quickLinkDraft.id ?? 'new'}
          initial={quickLinkDraft}
          onClose={() => setQuickLinkDraft(null)}
          onSaved={async () => {
            setQuickLinkDraft(null)
            await queryClient.invalidateQueries({ queryKey: QUICK_LINKS_QUERY_KEY })
          }}
        />
      ) : null}

      {renameTarget ? (
        <RenameWorkspaceDialog
          workspace={renameTarget}
          onClose={() => setRenameTarget(null)}
          onSaved={async () => {
            setRenameTarget(null)
            await queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY })
          }}
        />
      ) : null}

      {commandOpen ? (
        <CommandPalette
          tabs={tabs}
          bookmarks={bookmarks}
          workspaces={workspaces}
          onSave={setSaveCandidate}
          onNavigate={onNavigate}
        />
      ) : null}
    </div>
  )
}

function Header({ view, onNavigate, theme }: { view: WorkspaceView; onNavigate: (view: WorkspaceView) => void; theme: 'system' | 'light' | 'dark' }) {
  const navItems: Array<{ id: WorkspaceView; label: string; icon: ReactNode }> = [
    { id: 'home', label: '首页', icon: <LayoutGrid size={15} /> },
    { id: 'tabs', label: '标签', icon: <SquareStack size={15} /> },
    { id: 'bookmarks', label: '书签', icon: <Bookmark size={15} /> },
    { id: 'workspaces', label: '工作区', icon: <Layers3 size={15} /> },
  ]

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button className="brand" type="button" onClick={() => onNavigate('home')}>
          <span className="brand-mark"><Waves size={18} /></span>
          <span className="brand-copy"><strong>Harbor</strong><small>browser workspace</small></span>
        </button>

        <nav className="main-nav" aria-label="主导航">
          {navItems.map((item) => (
            <button key={item.id} className={view === item.id ? 'nav-item active' : 'nav-item'} type="button" onClick={() => onNavigate(item.id)}>
              {item.icon}<span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="topbar-actions">
          <button className="command-trigger" type="button" onClick={() => setCommandOpen(true)} title="命令面板">
            <Command size={15} /><span>搜索</span><kbd>⌘K</kbd>
          </button>
          <button className="icon-button" type="button" onClick={cycleTheme} title={`主题：${theme}`}>
            {theme === 'dark' ? <Moon size={16} /> : theme === 'light' ? <Sun size={16} /> : <Monitor size={16} />}
          </button>
          <button className="profile-button" type="button" title="当前为本地模式">
            <CircleUserRound size={17} /><span>本地</span>
          </button>
        </div>
      </div>
    </header>
  )
}

function HomeView({ tabs, workspaces, quickLinks, todos, loadingTabs, onNavigate, onSave, onEditQuickLink }: {
  tabs: BrowserTab[]
  workspaces: Workspace[]
  quickLinks: QuickLink[]
  todos: TodoItem[]
  loadingTabs: boolean
  onNavigate: (view: WorkspaceView) => void
  onSave: (tabs: BrowserTab[]) => void
  onEditQuickLink: (link?: QuickLink) => void
}) {
  return (
    <div className="home-grid">
      <div className="home-primary">
        <WelcomeBlock />
        <LiveTabsPanel tabs={tabs} loading={loadingTabs} onSave={onSave} compact />
      </div>
      <aside className="home-rail">
        <WebSearch />
        <QuickLinksPanel links={quickLinks} onEdit={onEditQuickLink} />
        <TodoPanel todos={todos} />
        <RecentWorkspaces workspaces={workspaces} onNavigate={onNavigate} />
      </aside>
    </div>
  )
}

function WelcomeBlock() {
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 6 ? '夜深了' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
  const date = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(now)

  return (
    <section className="welcome-block">
      <div>
        <p>{date}</p>
        <h1>{greeting}。</h1>
      </div>
      <span className="welcome-note"><Sparkles size={14} />把今天要用的页面留在眼前。</span>
    </section>
  )
}

function TabsView({ tabs, loading, onSave }: { tabs: BrowserTab[]; loading: boolean; onSave: (tabs: BrowserTab[]) => void }) {
  return (
    <section className="wide-view">
      <PageHeading eyebrow="LIVE TABS" title="标签" description="查看、搜索和整理当前所有窗口里的标签。" action={
        <button className="primary-button" type="button" onClick={() => onSave(tabs)} disabled={tabs.length === 0}>
          <FolderOpen size={15} />保存当前标签
        </button>
      } />
      <LiveTabsPanel tabs={tabs} loading={loading} onSave={onSave} />
    </section>
  )
}

function groupTabs(tabs: BrowserTab[]): TabGroupBucket[] {
  const buckets = new Map<string, TabGroupBucket>()
  for (const tab of tabs) {
    const hasNativeGroup = tab.groupId >= 0 && Boolean(tab.groupTitle)
    const title = hasNativeGroup ? tab.groupTitle! : hostnameFromUrl(tab.url)
    const key = hasNativeGroup ? `group:${tab.groupId}` : `domain:${title}`
    const current = buckets.get(key)
    if (current) current.tabs.push(tab)
    else buckets.set(key, { key, title, tabs: [tab], color: tab.groupColor })
  }
  return [...buckets.values()]
}

function LiveTabsPanel({ tabs, loading, onSave, compact = false }: { tabs: BrowserTab[]; loading: boolean; onSave: (tabs: BrowserTab[]) => void; compact?: boolean }) {
  const queryClient = useQueryClient()
  const search = useUiStore((state) => state.tabSearch)
  const selectedTabIds = useUiStore((state) => state.selectedTabIds)
  const scrollRef = useRef<HTMLDivElement>(null)
  const normalizedSearch = search.trim().toLowerCase()
  const visibleTabs = useMemo(() => tabs.filter((tab) => !normalizedSearch || `${tab.title} ${tab.url}`.toLowerCase().includes(normalizedSearch)), [tabs, normalizedSearch])
  const groups = useMemo(() => groupTabs(visibleTabs), [visibleTabs])
  const rows = useMemo<TabVirtualRow[]>(() => groups.flatMap((group) => [
    { kind: 'group' as const, key: `header:${group.key}`, group },
    ...group.tabs.map((tab) => ({ kind: 'tab' as const, key: `tab:${tab.id}`, tab, group })),
  ]), [groups])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => rows[index]?.kind === 'group' ? 44 : 42,
    overscan: 18,
  })

  const duplicateIds = useMemo(() => {
    const seen = new Set<string>()
    const duplicates: number[] = []
    for (const tab of tabs) {
      const key = normalizeUrl(tab.url)
      if (seen.has(key)) duplicates.push(tab.id)
      else seen.add(key)
    }
    return duplicates
  }, [tabs])

  const closeMutation = useMutation({
    mutationFn: closeTabs,
    onSuccess: async () => {
      setSelectedTabIds([])
      await queryClient.invalidateQueries({ queryKey: TABS_QUERY_KEY })
    },
  })

  return (
    <section className={compact ? 'surface live-tabs-card compact' : 'surface live-tabs-card'} aria-label="当前标签页">
      <div className="surface-head">
        <div>
          <span className="section-kicker">当前标签</span>
          <h2>{tabs.length}<small> tabs</small></h2>
        </div>
        <div className="head-actions">
          {duplicateIds.length > 0 ? <button className="text-button warn" type="button" onClick={() => setSelectedTabIds(duplicateIds)}>重复 {duplicateIds.length}</button> : null}
          <button className="text-button" type="button" onClick={() => onSave(visibleTabs)} disabled={visibleTabs.length === 0}>保存</button>
        </div>
      </div>

      <label className="search-field tab-search-field">
        <Search size={16} />
        <input value={search} onChange={(event) => setTabSearch(event.target.value)} placeholder="搜索标题、网址或站点" aria-label="搜索标签页" />
        {search ? <button type="button" onClick={() => setTabSearch('')} aria-label="清空"><X size={14} /></button> : <kbd>⌘K</kbd>}
      </label>

      <div className="list-meta"><span>{groups.length} 个分组</span><span>{selectedTabIds.length ? `已选 ${selectedTabIds.length}` : '点击左侧圆点多选'}</span></div>

      <div className={compact ? 'virtual-scroll compact' : 'virtual-scroll'} ref={scrollRef}>
        {loading ? <EmptyState title="正在读取标签页…" /> : null}
        {!loading && rows.length === 0 ? <EmptyState icon={<Search size={18} />} title="没有匹配的标签" description="换一个关键词试试。" /> : null}
        {rows.length > 0 ? (
          <div className="virtual-canvas" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index]
              if (!row) return null
              return (
                <div key={row.key} className="virtual-row" style={{ height: virtualRow.size, transform: `translateY(${virtualRow.start}px)` }}>
                  {row.kind === 'group' ? <TabGroupHeader group={row.group} onSave={() => onSave(row.group.tabs)} /> : (
                    <TabRow tab={row.tab} selected={selectedTabIds.includes(row.tab.id)} onClose={() => closeMutation.mutate([row.tab.id])} />
                  )}
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function TabGroupHeader({ group, onSave }: { group: TabGroupBucket; onSave: () => void }) {
  return (
    <div className="group-header">
      <div className="group-title"><span className="group-dot" data-color={group.color ?? 'neutral'} /><strong>{group.title}</strong><span>{group.tabs.length}</span></div>
      <button className="ghost-icon tiny" type="button" onClick={onSave} title="保存这个分组"><FolderOpen size={13} /></button>
    </div>
  )
}

function TabRow({ tab, selected, onClose }: { tab: BrowserTab; selected: boolean; onClose: () => void }) {
  return (
    <div className={selected ? 'tab-row selected' : tab.active ? 'tab-row active' : 'tab-row'}>
      <button className={selected ? 'select-dot checked' : 'select-dot'} type="button" onClick={() => toggleTabSelection(tab.id)} aria-label={selected ? '取消选择' : '选择标签'}>{selected ? <Check size={11} /> : null}</button>
      <button className="tab-main" type="button" onClick={() => void activateTab(tab)}>
        <SiteIcon title={tab.title} url={tab.url} src={tab.favIconUrl} />
        <span className="tab-copy"><strong>{tab.title}</strong><small>{hostnameFromUrl(tab.url)}</small></span>
      </button>
      <span className="tab-signals">{tab.pinned ? <Pin size={12} /> : null}{tab.audible ? <Volume2 size={12} /> : null}{tab.discarded ? <span className="sleep-dot" /> : null}</span>
      <button className="row-close" type="button" onClick={onClose} aria-label={`关闭 ${tab.title}`}><X size={14} /></button>
    </div>
  )
}

function BookmarksView({ bookmarks, loading }: { bookmarks: BrowserBookmark[]; loading: boolean }) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [expansionReady, setExpansionReady] = useState(false)
  const [focusedId, setFocusedId] = useState<string>()
  const scrollRef = useRef<HTMLDivElement>(null)
  const normalized = search.trim().toLowerCase()
  const tree = useMemo(() => buildBookmarkTree(bookmarks), [bookmarks])
  const rows = useMemo(
    () => flattenBookmarkTree(tree, expanded, normalized),
    [tree, expanded, normalized],
  )
  const visibleBookmarks = rows.filter((row) => row.kind === 'bookmark').length
  const virtualizer = useVirtualizer({ count: rows.length, getScrollElement: () => scrollRef.current, estimateSize: () => 34, overscan: 24 })

  useEffect(() => {
    if (tree.length === 0 || expansionReady) return
    const initialExpanded = getInitialExpandedFolderIds(tree)
    const saved = window.localStorage.getItem(BOOKMARK_EXPANSION_KEY)
    setExpanded(parseExpandedFolderIds(saved, initialExpanded))
    setExpansionReady(true)
  }, [expansionReady, tree])

  useEffect(() => {
    if (!expansionReady) return
    window.localStorage.setItem(
      BOOKMARK_EXPANSION_KEY,
      JSON.stringify([...expanded]),
    )
  }, [expanded, expansionReady])

  useEffect(() => {
    if (rows.length === 0) {
      setFocusedId(undefined)
      return
    }
    if (!focusedId || !rows.some((row) => row.id === focusedId)) {
      setFocusedId(rows[0]!.id)
    }
  }, [focusedId, rows])

  const focusTreeRow = (id: string) => {
    const index = rows.findIndex((row) => row.id === id)
    if (index < 0) return
    setFocusedId(id)
    virtualizer.scrollToIndex(index, { align: 'auto' })
    window.requestAnimationFrame(() => {
      const elements = scrollRef.current?.querySelectorAll<HTMLElement>('[data-tree-id]')
      const target = [...(elements ?? [])].find((element) => element.dataset.treeId === id)
      target?.focus()
    })
  }

  const setFolderExpanded = (id: string, shouldExpand: boolean) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (shouldExpand) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const activateRow = (row: BookmarkTreeRow) => {
    if (row.kind === 'folder') {
      setFolderExpanded(row.id, !row.expanded)
      focusTreeRow(row.id)
      return
    }
    void openUrl(row.bookmark.url)
  }

  const handleTreeKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>, row: BookmarkTreeRow) => {
    const action = getBookmarkTreeKeyAction(rows, row.id, event.key)
    if (action.type === 'none') return
    event.preventDefault()

    if (action.type === 'focus') focusTreeRow(action.id)
    if (action.type === 'expand') setFolderExpanded(action.id, true)
    if (action.type === 'collapse') setFolderExpanded(action.id, false)
    if (action.type === 'activate' && row.kind === 'bookmark') void openUrl(row.bookmark.url)
  }

  return (
    <section className="wide-view">
      <PageHeading eyebrow="CHROME BOOKMARKS" title="书签" description={`直接查看 Chrome 中的全部书签，共 ${bookmarks.length} 项。`} action={
        <button className="secondary-button" type="button" onClick={() => void openBookmarksManager()}><ExternalLink size={14} />Chrome 书签管理器</button>
      } />
      <div className="surface bookmark-surface">
        <label className="search-field bookmark-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索书签、网址或文件夹" />{search ? <button type="button" onClick={() => setSearch('')}><X size={14} /></button> : null}</label>
        <div className="list-meta"><span>{tree.length} 个顶层文件夹</span><span>{normalized ? `${visibleBookmarks} 项匹配` : `${bookmarks.length} 项`}</span></div>
        <div className="bookmark-scroll" ref={scrollRef}>
          {loading ? <EmptyState title="正在读取 Chrome 书签…" /> : null}
          {!loading && rows.length === 0 ? <EmptyState icon={<Bookmark size={18} />} title="没有找到书签" description="试试其他关键词。" /> : null}
          {rows.length > 0 ? <div className="bookmark-tree" role="tree" aria-label="Chrome 书签"><div className="virtual-canvas" style={{ height: virtualizer.getTotalSize() }}>{virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index]
            if (!row) return null
            return <div key={row.id} className="virtual-row" style={{ height: virtualRow.size, transform: `translateY(${virtualRow.start}px)` }}><BookmarkTreeItem
              row={row}
              tabIndex={focusedId === row.id ? 0 : -1}
              onActivate={() => activateRow(row)}
              onFocus={() => setFocusedId(row.id)}
              onKeyDown={(event) => handleTreeKeyDown(event, row)}
              onOpenNewTab={() => row.kind === 'bookmark' && void openUrlInNewTab(row.bookmark.url)}
            /></div>
          })}</div></div> : null}
        </div>
      </div>
    </section>
  )
}

interface BookmarkTreeItemProps {
  row: BookmarkTreeRow
  tabIndex: number
  onActivate: () => void
  onFocus: () => void
  onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void
  onOpenNewTab: () => void
}

export function BookmarkTreeItem({
  row,
  tabIndex,
  onActivate,
  onFocus,
  onKeyDown,
  onOpenNewTab,
}: BookmarkTreeItemProps) {
  const style = { '--tree-depth': row.depth } as CSSProperties

  return (
    <div
      className={`bookmark-tree-row ${row.kind}`}
      role="treeitem"
      aria-level={row.depth + 1}
      aria-expanded={row.kind === 'folder' ? row.expanded : undefined}
      data-tree-id={row.id}
      style={style}
      tabIndex={tabIndex}
      title={row.kind === 'folder' ? row.folder.path.join(' / ') : row.bookmark.url}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
    >
      {row.kind === 'folder' ? (
        <button className="bookmark-tree-main" type="button" tabIndex={-1} onClick={onActivate}>
          <span className={row.expanded ? 'tree-disclosure expanded' : 'tree-disclosure'}>
            <ChevronRight size={13} />
          </span>
          <Folder size={14} className="tree-folder-icon" />
          <span className="tree-label">{row.label}</span>
          <span className="tree-count">{row.folder.bookmarkCount}</span>
        </button>
      ) : (
        <>
          <button className="bookmark-tree-main" type="button" tabIndex={-1} onClick={onActivate}>
            <span className="tree-disclosure" />
            <SiteIcon title={row.bookmark.title} url={row.bookmark.url} small />
            <span className="tree-label">{row.label}</span>
          </button>
          <button
            className="ghost-icon tree-open-action"
            type="button"
            onClick={onOpenNewTab}
            title="在新标签打开"
            aria-label={`在新标签打开 ${row.label}`}
          >
            <ExternalLink size={13} />
          </button>
        </>
      )}
    </div>
  )
}

function QuickLinksPanel({ links, onEdit }: { links: QuickLink[]; onEdit: (link?: QuickLink) => void }) {
  const queryClient = useQueryClient()
  const removeMutation = useMutation({ mutationFn: removeQuickLink, onSuccess: () => queryClient.invalidateQueries({ queryKey: QUICK_LINKS_QUERY_KEY }) })

  return (
    <section className="rail-card quick-links-card">
      <RailHeading icon={<Globe2 size={15} />} title="快捷入口" action={<button className="ghost-icon" type="button" onClick={() => onEdit()} title="添加快捷入口"><Plus size={15} /></button>} />
      <div className="quick-grid">
        {links.map((link) => (
          <div className="quick-item" key={link.id}>
            <button className="quick-main" type="button" onClick={() => void openUrl(link.url)}>
              <SiteIcon title={link.title} url={link.url} fallback={link.label} />
              <span>{link.title}</span>
            </button>
            <details className="item-menu">
              <summary aria-label={`${link.title} 更多操作`}><MoreHorizontal size={14} /></summary>
              <div className="menu-popover">
                <button type="button" onClick={() => onEdit(link)}><Pencil size={13} />编辑</button>
                <button type="button" onClick={() => void openUrlInNewTab(link.url)}><ExternalLink size={13} />新标签打开</button>
                <button className="danger" type="button" onClick={() => removeMutation.mutate(link.id)}><Trash2 size={13} />删除</button>
              </div>
            </details>
          </div>
        ))}
        <button className="quick-add" type="button" onClick={() => onEdit()}><Plus size={17} /><span>添加</span></button>
      </div>
    </section>
  )
}

function TodoPanel({ todos }: { todos: TodoItem[] }) {
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const createMutation = useMutation({ mutationFn: createTodo, onSuccess: async () => { setText(''); await queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY }) } })
  const updateMutation = useMutation({ mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<TodoItem, 'text' | 'completed'>> }) => updateTodo(id, patch), onSuccess: () => queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY }) })
  const removeMutation = useMutation({ mutationFn: removeTodo, onSuccess: () => queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY }) })
  const clearMutation = useMutation({ mutationFn: clearCompletedTodos, onSuccess: () => queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY }) })
  const completed = todos.filter((todo) => todo.completed).length

  return (
    <section className="rail-card todo-card">
      <RailHeading icon={<ListTodo size={15} />} title="待办" action={completed ? <button className="text-button" type="button" onClick={() => clearMutation.mutate()}>清理已完成</button> : null} />
      <form className="todo-add" onSubmit={(event) => { event.preventDefault(); if (text.trim()) createMutation.mutate(text) }}>
        <Plus size={14} /><input value={text} onChange={(event) => setText(event.target.value)} placeholder="添加一件小事…" /><kbd>↵</kbd>
      </form>
      <div className="todo-list">
        {todos.length === 0 ? <p className="soft-empty">今天还没有待办。</p> : todos.slice(0, 7).map((todo) => (
          <TodoRow key={todo.id} todo={todo} onToggle={() => updateMutation.mutate({ id: todo.id, patch: { completed: !todo.completed } })} onEdit={(value) => updateMutation.mutate({ id: todo.id, patch: { text: value } })} onRemove={() => removeMutation.mutate(todo.id)} />
        ))}
      </div>
    </section>
  )
}

function TodoRow({ todo, onToggle, onEdit, onRemove }: { todo: TodoItem; onToggle: () => void; onEdit: (text: string) => void; onRemove: () => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(todo.text)

  const save = () => {
    if (value.trim() && value.trim() !== todo.text) onEdit(value)
    setEditing(false)
  }

  return (
    <div className={todo.completed ? 'todo-row completed' : 'todo-row'}>
      <button className={todo.completed ? 'todo-check checked' : 'todo-check'} type="button" onClick={onToggle}>{todo.completed ? <Check size={11} /> : null}</button>
      {editing ? <input className="todo-edit" autoFocus value={value} onChange={(event) => setValue(event.target.value)} onBlur={save} onKeyDown={(event) => { if (event.key === 'Enter') save(); if (event.key === 'Escape') { setValue(todo.text); setEditing(false) } }} /> : <span className="todo-text">{todo.text}</span>}
      <details className="item-menu todo-menu"><summary aria-label="更多操作"><MoreHorizontal size={14} /></summary><div className="menu-popover"><button type="button" onClick={() => setEditing(true)}><Pencil size={13} />编辑</button><button className="danger" type="button" onClick={onRemove}><Trash2 size={13} />删除</button></div></details>
    </div>
  )
}

function RecentWorkspaces({ workspaces, onNavigate }: { workspaces: Workspace[]; onNavigate: (view: WorkspaceView) => void }) {
  return (
    <section className="rail-card recent-card">
      <RailHeading icon={<Layers3 size={15} />} title="最近工作区" action={<button className="text-button" type="button" onClick={() => onNavigate('workspaces')}>全部</button>} />
      <div className="recent-list">
        {workspaces.length === 0 ? <p className="soft-empty">保存一组标签后，它会出现在这里。</p> : workspaces.slice(0, 4).map((workspace) => (
          <button className="recent-row" key={workspace.id} type="button" onClick={() => void restoreUrls(workspace.tabs.map((tab) => tab.url))}>
            <span className="recent-icon"><Layers3 size={14} /></span><span><strong>{workspace.name}</strong><small>{workspace.tabs.length} tabs · {relativeTime(workspace.updatedAt)}</small></span><ChevronRight size={14} />
          </button>
        ))}
      </div>
    </section>
  )
}

function WebSearch() {
  const [query, setQuery] = useState('')
  const submit = () => {
    const value = query.trim()
    if (!value) return
    const looksLikeUrl = /^(https?:\/\/|localhost[:/]|[\w-]+\.[a-z]{2,})/i.test(value)
    const target = looksLikeUrl ? (value.startsWith('http') ? value : `https://${value}`) : `https://www.google.com/search?q=${encodeURIComponent(value)}`
    void openUrl(target)
  }
  return (
    <form className="web-search" onSubmit={(event) => { event.preventDefault(); submit() }}>
      <Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索网页或输入网址" /><span>Google</span>
    </form>
  )
}

function WorkspacesView({ tabs, workspaces, onSave, onRename }: { tabs: BrowserTab[]; workspaces: Workspace[]; onSave: (tabs: BrowserTab[]) => void; onRename: (workspace: Workspace) => void }) {
  const queryClient = useQueryClient()
  const removeMutation = useMutation({ mutationFn: removeWorkspace, onSuccess: () => queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY }) })

  return (
    <section className="wide-view">
      <PageHeading eyebrow="WORKSPACES" title="工作区" description="把一组临时标签保存成可以随时恢复的上下文。" action={<button className="primary-button" type="button" onClick={() => onSave(tabs)} disabled={!tabs.length}><Plus size={15} />保存当前标签</button>} />
      {workspaces.length === 0 ? <div className="surface big-empty"><span className="empty-orb"><Layers3 size={22} /></span><h2>从正在做的事情开始</h2><p>把当前标签保存成第一个工作区，以后可以一键恢复。</p><button className="primary-button" type="button" onClick={() => onSave(tabs)}>创建工作区</button></div> : (
        <div className="workspace-grid">
          {workspaces.map((workspace) => (
            <article className="workspace-card" key={workspace.id}>
              <div className="workspace-top"><span className="workspace-icon"><Layers3 size={16} /></span><details className="item-menu"><summary aria-label="工作区更多操作"><MoreHorizontal size={15} /></summary><div className="menu-popover"><button type="button" onClick={() => onRename(workspace)}><Pencil size={13} />重命名</button><button className="danger" type="button" onClick={() => removeMutation.mutate(workspace.id)}><Trash2 size={13} />删除</button></div></details></div>
              <div className="workspace-copy"><h2>{workspace.name}</h2><p>{workspace.tabs.length} tabs · {relativeTime(workspace.updatedAt)}</p></div>
              <div className="workspace-sites">{workspace.tabs.slice(0, 6).map((tab) => <SiteIcon key={tab.id} title={tab.title} url={tab.url} src={tab.favIconUrl} />)}{workspace.tabs.length > 6 ? <span className="site-more">+{workspace.tabs.length - 6}</span> : null}</div>
              <div className="workspace-footer"><span>{uniqueHosts(workspace).slice(0, 3).join(' · ')}</span><button type="button" onClick={() => void restoreUrls(workspace.tabs.map((tab) => tab.url))}>打开 <ExternalLink size={13} /></button></div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function SaveWorkspaceDialog({ tabs, onClose, onSaved }: { tabs: BrowserTab[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const form = useForm({ defaultValues: { name: '' }, onSubmit: async ({ value }) => { await createWorkspace(value.name, tabs); await onSaved() } })
  return (
    <Modal title="保存为工作区" subtitle={`${tabs.length} 个标签`} onClose={onClose}>
      <form onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); void form.handleSubmit() }}>
        <form.Field name="name">{(field) => <label className="field-block"><span>名称</span><input autoFocus value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} placeholder="例如：EdgeInfer 开发" /></label>}</form.Field>
        <div className="dialog-preview">{tabs.slice(0, 4).map((tab) => <span key={tab.id}>{tab.title}</span>)}{tabs.length > 4 ? <small>+{tabs.length - 4}</small> : null}</div>
        <div className="dialog-actions"><button className="secondary-button" type="button" onClick={onClose}>取消</button><button className="primary-button" type="submit">保存</button></div>
      </form>
    </Modal>
  )
}

function QuickLinkDialog({ initial, onClose, onSaved }: { initial: QuickLinkDraft; onClose: () => void; onSaved: () => Promise<void> }) {
  const form = useForm({ defaultValues: { title: initial.title, url: initial.url, label: initial.label }, onSubmit: async ({ value }) => { if (!value.title.trim() || !value.url.trim()) return; const url = /^https?:\/\//i.test(value.url) ? value.url : `https://${value.url}`; await saveQuickLink({ id: initial.id, title: value.title, url, label: value.label }); await onSaved() } })
  return (
    <Modal title={initial.id ? '编辑快捷入口' : '添加快捷入口'} subtitle="保存在本机" onClose={onClose}>
      <form onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); void form.handleSubmit() }}>
        <div className="field-grid"><form.Field name="title">{(field) => <label className="field-block"><span>名称</span><input autoFocus value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} placeholder="GitHub" /></label>}</form.Field><form.Field name="label">{(field) => <label className="field-block small-field"><span>缩写</span><input maxLength={3} value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} placeholder="GH" /></label>}</form.Field></div>
        <form.Field name="url">{(field) => <label className="field-block"><span>网址</span><input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} placeholder="https://github.com" /></label>}</form.Field>
        <div className="dialog-actions"><button className="secondary-button" type="button" onClick={onClose}>取消</button><button className="primary-button" type="submit">保存</button></div>
      </form>
    </Modal>
  )
}

function RenameWorkspaceDialog({ workspace, onClose, onSaved }: { workspace: Workspace; onClose: () => void; onSaved: () => Promise<void> }) {
  const form = useForm({ defaultValues: { name: workspace.name }, onSubmit: async ({ value }) => { await renameWorkspace(workspace.id, value.name); await onSaved() } })
  return (
    <Modal title="重命名工作区" subtitle={`${workspace.tabs.length} 个标签`} onClose={onClose}>
      <form onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); void form.handleSubmit() }}><form.Field name="name">{(field) => <label className="field-block"><span>名称</span><input autoFocus value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} /></label>}</form.Field><div className="dialog-actions"><button className="secondary-button" type="button" onClick={onClose}>取消</button><button className="primary-button" type="submit">保存</button></div></form>
    </Modal>
  )
}

function SelectionBar({ tabs, onSave, onDone }: { tabs: BrowserTab[]; onSave: () => void; onDone: () => void }) {
  const queryClient = useQueryClient()
  const closeMutation = useMutation({ mutationFn: () => closeTabs(tabs.map((tab) => tab.id)), onSuccess: async () => { onDone(); await queryClient.invalidateQueries({ queryKey: TABS_QUERY_KEY }) } })
  return <div className="selection-bar"><strong>{tabs.length} 个已选</strong><span /><button type="button" onClick={onSave}><FolderOpen size={14} />保存</button><button className="danger" type="button" onClick={() => closeMutation.mutate()}><Trash2 size={14} />关闭</button><button className="selection-close" type="button" onClick={onDone}><X size={14} /></button></div>
}

function CommandPalette({ tabs, bookmarks, workspaces, onSave, onNavigate }: { tabs: BrowserTab[]; bookmarks: BrowserBookmark[]; workspaces: Workspace[]; onSave: (tabs: BrowserTab[]) => void; onNavigate: (view: WorkspaceView) => void }) {
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLowerCase()
  const matchingTabs = tabs.filter((tab) => `${tab.title} ${tab.url}`.toLowerCase().includes(normalized)).slice(0, 5)
  const matchingBookmarks = bookmarks.filter((bookmark) => `${bookmark.title} ${bookmark.url}`.toLowerCase().includes(normalized)).slice(0, 5)
  const matchingWorkspaces = workspaces.filter((workspace) => workspace.name.toLowerCase().includes(normalized)).slice(0, 4)
  const run = (action: () => void | Promise<void>) => { setCommandOpen(false); void action() }

  return (
    <div className="command-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setCommandOpen(false)}>
      <div className="command-panel" role="dialog" aria-modal="true" aria-label="搜索与命令">
        <label className="command-search"><Search size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标签、书签、工作区或命令…" /><kbd>ESC</kbd></label>
        <div className="command-results">
          {!normalized ? <CommandGroup title="快速操作"><CommandItem icon={<SquareStack size={15} />} title="查看全部标签" hint="Navigation" onClick={() => run(() => onNavigate('tabs'))} /><CommandItem icon={<Bookmark size={15} />} title="查看 Chrome 书签" hint="Navigation" onClick={() => run(() => onNavigate('bookmarks'))} /><CommandItem icon={<FolderOpen size={15} />} title="保存当前标签为工作区" hint="Action" onClick={() => run(() => onSave(tabs))} /></CommandGroup> : null}
          {normalized && matchingTabs.length ? <CommandGroup title="标签">{matchingTabs.map((tab) => <CommandItem key={tab.id} icon={<SiteIcon title={tab.title} url={tab.url} src={tab.favIconUrl} small />} title={tab.title} hint={hostnameFromUrl(tab.url)} onClick={() => run(() => activateTab(tab))} />)}</CommandGroup> : null}
          {normalized && matchingBookmarks.length ? <CommandGroup title="书签">{matchingBookmarks.map((bookmark) => <CommandItem key={bookmark.id} icon={<Bookmark size={14} />} title={bookmark.title} hint={hostnameFromUrl(bookmark.url)} onClick={() => run(() => openUrl(bookmark.url))} />)}</CommandGroup> : null}
          {normalized && matchingWorkspaces.length ? <CommandGroup title="工作区">{matchingWorkspaces.map((workspace) => <CommandItem key={workspace.id} icon={<Layers3 size={14} />} title={workspace.name} hint={`${workspace.tabs.length} tabs`} onClick={() => run(() => restoreUrls(workspace.tabs.map((tab) => tab.url)))} />)}</CommandGroup> : null}
          {normalized && !matchingTabs.length && !matchingBookmarks.length && !matchingWorkspaces.length ? <div className="command-empty">没有找到匹配内容</div> : null}
        </div>
      </div>
    </div>
  )
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="dialog-card" role="dialog" aria-modal="true"><div className="dialog-head"><div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div><button className="ghost-icon" type="button" onClick={onClose}><X size={16} /></button></div>{children}</div></div>
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><span className="section-kicker">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function RailHeading({ icon, title, action }: { icon: ReactNode; title: string; action?: ReactNode }) {
  return <div className="rail-heading"><div>{icon}<h3>{title}</h3></div>{action}</div>
}

function EmptyState({ icon, title, description }: { icon?: ReactNode; title: string; description?: string }) {
  return <div className="empty-state">{icon}<strong>{title}</strong>{description ? <span>{description}</span> : null}</div>
}

function SiteIcon({ title, url, src, fallback, small = false }: { title: string; url: string; src?: string; fallback?: string; small?: boolean }) {
  const [broken, setBroken] = useState(false)
  const iconSrc = src || faviconUrlForPage(url, small ? 20 : 32)
  const text = (fallback || title || hostnameFromUrl(url)).trim().slice(0, 2).toUpperCase()
  return <span className={small ? 'site-icon small' : 'site-icon'}>{iconSrc && !broken ? <img src={iconSrc} alt="" onError={() => setBroken(true)} /> : <span>{text}</span>}</span>
}

function CommandGroup({ title, children }: { title: string; children: ReactNode }) {
  return <section className="command-group"><h3>{title}</h3>{children}</section>
}

function CommandItem({ icon, title, hint, onClick }: { icon: ReactNode; title: string; hint: string; onClick: () => void }) {
  return <button className="command-item" type="button" onClick={onClick}><span className="command-icon">{icon}</span><strong>{title}</strong><small>{hint}</small></button>
}

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.max(0, Math.floor(diff / 60_000))
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(value))
}

function uniqueHosts(workspace: Workspace) {
  return [...new Set(workspace.tabs.map((tab) => hostnameFromUrl(tab.url)))]
}
