import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Check,
  ChevronRight,
  CircleUserRound,
  Cloud,
  Command,
  ExternalLink,
  FolderOpen,
  Keyboard,
  Laptop,
  Layers3,
  LogIn,
  Monitor,
  Moon,
  Pin,
  Plus,
  Search,
  Sun,
  Trash2,
  Volume2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  activateTab,
  closeTabs,
  hostnameFromUrl,
  normalizeUrl,
  openUrl,
  queryLiveTabs,
  restoreUrls,
  subscribeToTabChanges,
} from '../lib/chrome'
import { quickLinks } from '../lib/demo-data'
import { createWorkspace, listWorkspaces, removeWorkspace } from '../lib/storage'
import type { BrowserTab, TabGroupBucket, Workspace, WorkspaceView } from '../lib/types'
import {
  cycleTheme,
  setCommandOpen,
  setSelectedTabIds,
  setTabSearch,
  toggleTabSelection,
  useUiStore,
} from '../state/ui-store'

const TABS_QUERY_KEY = ['live-tabs'] as const
const WORKSPACES_QUERY_KEY = ['workspaces'] as const

type VirtualRow =
  | { kind: 'group'; key: string; group: TabGroupBucket }
  | { kind: 'tab'; key: string; tab: BrowserTab; group: TabGroupBucket }

interface DashboardProps {
  view: WorkspaceView
  onNavigate: (view: WorkspaceView) => void
}

export function Dashboard({ view, onNavigate }: DashboardProps) {
  const queryClient = useQueryClient()
  const tabSearch = useUiStore((state) => state.tabSearch)
  const selectedTabIds = useUiStore((state) => state.selectedTabIds)
  const commandOpen = useUiStore((state) => state.commandOpen)
  const theme = useUiStore((state) => state.theme)
  const [saveCandidate, setSaveCandidate] = useState<BrowserTab[] | null>(null)

  const tabsQuery = useQuery({ queryKey: TABS_QUERY_KEY, queryFn: queryLiveTabs })
  const workspacesQuery = useQuery({ queryKey: WORKSPACES_QUERY_KEY, queryFn: listWorkspaces })

  useEffect(() => {
    return subscribeToTabChanges(() => {
      void queryClient.invalidateQueries({ queryKey: TABS_QUERY_KEY })
    })
  }, [queryClient])

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
  const workspaces = workspacesQuery.data ?? []
  const selectedTabs = tabs.filter((tab) => selectedTabIds.includes(tab.id))

  return (
    <div className="app-shell">
      <Header view={view} onNavigate={onNavigate} theme={theme} />

      <main className="page-shell">
        {view === 'home' ? (
          <HomeView
            tabs={tabs}
            workspaces={workspaces}
            tabSearch={tabSearch}
            selectedTabIds={selectedTabIds}
            loading={tabsQuery.isLoading}
            onSave={(candidate) => setSaveCandidate(candidate)}
          />
        ) : null}
        {view === 'workspaces' ? (
          <WorkspacesView
            tabs={tabs}
            workspaces={workspaces}
            onSave={(candidate) => setSaveCandidate(candidate)}
          />
        ) : null}
        {view === 'devices' ? <DevicesView /> : null}
      </main>

      {selectedTabs.length > 0 ? (
        <SelectionBar
          tabs={selectedTabs}
          onSave={() => setSaveCandidate(selectedTabs)}
          onDone={() => setSelectedTabIds([])}
        />
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

      {commandOpen ? (
        <CommandPalette
          tabs={tabs}
          workspaces={workspaces}
          onSave={(candidate) => setSaveCandidate(candidate)}
          onNavigate={onNavigate}
        />
      ) : null}
    </div>
  )
}

function Header({
  view,
  onNavigate,
  theme,
}: {
  view: WorkspaceView
  onNavigate: (view: WorkspaceView) => void
  theme: 'system' | 'light' | 'dark'
}) {
  const navItems: Array<{ id: WorkspaceView; label: string }> = [
    { id: 'home', label: '首页' },
    { id: 'workspaces', label: '工作空间' },
    { id: 'devices', label: '设备' },
  ]

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button className="brand" type="button" onClick={() => onNavigate('home')}>
          <span className="brand-mark">TH</span>
          <span>Tab Harbor</span>
        </button>

        <nav className="main-nav" aria-label="主导航">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? 'nav-item active' : 'nav-item'}
              type="button"
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="topbar-actions">
          <button className="sync-state" type="button" onClick={() => onNavigate('devices')}>
            <Cloud size={14} />
            <span>本地模式</span>
          </button>
          <button className="icon-button" type="button" onClick={() => setCommandOpen(true)} title="命令面板">
            <Command size={16} />
          </button>
          <button className="icon-button" type="button" onClick={cycleTheme} title={`主题：${theme}`}>
            {theme === 'dark' ? <Moon size={16} /> : theme === 'light' ? <Sun size={16} /> : <Monitor size={16} />}
          </button>
          <button className="login-button" type="button" onClick={() => onNavigate('devices')}>
            <CircleUserRound size={16} />
            登录
          </button>
        </div>
      </div>
    </header>
  )
}

function HomeView({
  tabs,
  workspaces,
  tabSearch,
  selectedTabIds,
  loading,
  onSave,
}: {
  tabs: BrowserTab[]
  workspaces: Workspace[]
  tabSearch: string
  selectedTabIds: number[]
  loading: boolean
  onSave: (tabs: BrowserTab[]) => void
}) {
  return (
    <div className="home-grid">
      <LiveTabsPanel
        tabs={tabs}
        search={tabSearch}
        selectedTabIds={selectedTabIds}
        loading={loading}
        onSave={onSave}
      />
      <HomeRail tabs={tabs} workspaces={workspaces} />
    </div>
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

function LiveTabsPanel({
  tabs,
  search,
  selectedTabIds,
  loading,
  onSave,
}: {
  tabs: BrowserTab[]
  search: string
  selectedTabIds: number[]
  loading: boolean
  onSave: (tabs: BrowserTab[]) => void
}) {
  const queryClient = useQueryClient()
  const scrollRef = useRef<HTMLDivElement>(null)
  const normalizedSearch = search.trim().toLowerCase()
  const visibleTabs = useMemo(
    () =>
      tabs.filter((tab) => {
        if (!normalizedSearch) return true
        return `${tab.title} ${tab.url}`.toLowerCase().includes(normalizedSearch)
      }),
    [tabs, normalizedSearch],
  )
  const groups = useMemo(() => groupTabs(visibleTabs), [visibleTabs])
  const rows = useMemo<VirtualRow[]>(
    () =>
      groups.flatMap((group) => [
        { kind: 'group' as const, key: `header:${group.key}`, group },
        ...group.tabs.map((tab) => ({ kind: 'tab' as const, key: `tab:${tab.id}`, tab, group })),
      ]),
    [groups],
  )

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => (rows[index]?.kind === 'group' ? 48 : 42),
    overscan: 16,
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
    <section className="live-panel" aria-label="当前标签页">
      <div className="section-heading-row">
        <div>
          <div className="eyebrow">LIVE TABS</div>
          <h1>当前标签页 <span>{tabs.length}</span></h1>
        </div>
        <button className="quiet-button" type="button" onClick={() => onSave(visibleTabs)} disabled={visibleTabs.length === 0}>
          <FolderOpen size={15} />
          保存为工作空间
        </button>
      </div>

      <div className="tab-toolbar">
        <label className="tab-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setTabSearch(event.target.value)}
            placeholder="搜索标题或网址"
            aria-label="搜索标签页"
          />
          <kbd>⌘ K</kbd>
        </label>
        {duplicateIds.length > 0 ? (
          <button className="duplicate-button" type="button" onClick={() => setSelectedTabIds(duplicateIds)}>
            重复 {duplicateIds.length}
          </button>
        ) : null}
      </div>

      <div className="tab-summary-row">
        <span>{groups.length} 个分组</span>
        <span>{selectedTabIds.length > 0 ? `已选择 ${selectedTabIds.length}` : '可多选后批量处理'}</span>
      </div>

      <div className="tab-scroll" ref={scrollRef}>
        {loading ? <div className="empty-state">正在读取浏览器标签页…</div> : null}
        {!loading && rows.length === 0 ? (
          <div className="empty-state">
            <Search size={18} />
            <strong>没有匹配的标签页</strong>
            <span>换一个关键词，或者清空搜索。</span>
          </div>
        ) : null}
        {rows.length > 0 ? (
          <div className="virtual-canvas" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index]
              if (!row) return null
              return (
                <div
                  key={row.key}
                  className="virtual-row"
                  style={{ height: virtualRow.size, transform: `translateY(${virtualRow.start}px)` }}
                >
                  {row.kind === 'group' ? (
                    <GroupHeader group={row.group} onSave={() => onSave(row.group.tabs)} />
                  ) : (
                    <TabRow
                      tab={row.tab}
                      selected={selectedTabIds.includes(row.tab.id)}
                      onClose={() => closeMutation.mutate([row.tab.id])}
                    />
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

function GroupHeader({ group, onSave }: { group: TabGroupBucket; onSave: () => void }) {
  return (
    <div className="group-header">
      <div className="group-title-wrap">
        <span className="group-dot" data-color={group.color ?? 'neutral'} />
        <strong>{group.title}</strong>
        <span>{group.tabs.length}</span>
      </div>
      <button className="text-action" type="button" onClick={onSave}>保存</button>
    </div>
  )
}

function TabRow({ tab, selected, onClose }: { tab: BrowserTab; selected: boolean; onClose: () => void }) {
  return (
    <div className={selected ? 'tab-row selected' : tab.active ? 'tab-row active' : 'tab-row'}>
      <button
        className={selected ? 'selection-box checked' : 'selection-box'}
        type="button"
        onClick={() => toggleTabSelection(tab.id)}
        aria-label={selected ? '取消选择' : '选择标签页'}
      >
        {selected ? <Check size={12} /> : null}
      </button>
      <button className="tab-main" type="button" onClick={() => void activateTab(tab)}>
        <Favicon tab={tab} />
        <span className="tab-copy">
          <span className="tab-title">{tab.title}</span>
          <span className="tab-host">{hostnameFromUrl(tab.url)}</span>
        </span>
      </button>
      <div className="tab-signals" aria-label="标签状态">
        {tab.pinned ? <Pin size={13} /> : null}
        {tab.audible ? <Volume2 size={13} /> : null}
        {tab.discarded ? <span className="sleep-dot" title="标签页已被浏览器释放" /> : null}
      </div>
      <button className="row-close" type="button" onClick={onClose} aria-label={`关闭 ${tab.title}`}>
        <X size={14} />
      </button>
    </div>
  )
}

function Favicon({ tab }: { tab: BrowserTab }) {
  const fallback = hostnameFromUrl(tab.url).slice(0, 1).toUpperCase()
  if (!tab.favIconUrl) return <span className="favicon fallback">{fallback}</span>
  return (
    <span className="favicon">
      <img
        src={tab.favIconUrl}
        alt=""
        onError={(event) => {
          event.currentTarget.style.display = 'none'
          event.currentTarget.parentElement?.classList.add('fallback')
          if (event.currentTarget.parentElement) event.currentTarget.parentElement.textContent = fallback
        }}
      />
    </span>
  )
}

function HomeRail({ tabs, workspaces }: { tabs: BrowserTab[]; workspaces: Workspace[] }) {
  const [search, setSearch] = useState('')
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 6 ? '夜深了' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
  const date = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(now)

  return (
    <aside className="home-rail">
      <div className="greeting-block">
        <div className="greeting-line">
          <h2>{greeting}</h2>
          <span>{date}</span>
        </div>
        <p>把正在做的事放在眼前，其余的先收进港湾。</p>
      </div>

      <form
        className="web-search"
        onSubmit={(event) => {
          event.preventDefault()
          const query = search.trim()
          if (query) void openUrl(`https://www.google.com/search?q=${encodeURIComponent(query)}`)
        }}
      >
        <Search size={16} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="用默认搜索引擎搜索…" />
      </form>

      <RailSection title="快捷访问" action={<button type="button" className="mini-add"><Plus size={14} /></button>}>
        <div className="quick-grid">
          {quickLinks.map((link) => (
            <button key={link.id} className="quick-link" type="button" onClick={() => void openUrl(link.url)}>
              <span className="quick-icon">{link.label}</span>
              <span>{link.title}</span>
            </button>
          ))}
        </div>
      </RailSection>

      <RailSection title="最近工作空间">
        <div className="rail-list">
          {workspaces.length === 0 ? (
            <div className="rail-empty">还没有工作空间。可以从左侧保存当前标签。</div>
          ) : (
            workspaces.slice(0, 3).map((workspace) => (
              <button key={workspace.id} className="rail-item" type="button" onClick={() => void restoreUrls(workspace.tabs.map((tab) => tab.url))}>
                <span className="rail-icon"><Layers3 size={15} /></span>
                <span className="rail-item-copy">
                  <strong>{workspace.name}</strong>
                  <small>{workspace.tabs.length} Tabs · {relativeTime(workspace.updatedAt)}</small>
                </span>
                <ChevronRight size={14} />
              </button>
            ))
          )}
        </div>
      </RailSection>

      <RailSection title="此设备">
        <div className="device-inline">
          <span className="device-icon"><Laptop size={16} /></span>
          <span>
            <strong>当前浏览器</strong>
            <small>{tabs.length} Tabs · 本地数据</small>
          </span>
          <span className="local-badge">Local</span>
        </div>
      </RailSection>
    </aside>
  )
}

function RailSection({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rail-section">
      <div className="rail-heading">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function WorkspacesView({
  tabs,
  workspaces,
  onSave,
}: {
  tabs: BrowserTab[]
  workspaces: Workspace[]
  onSave: (tabs: BrowserTab[]) => void
}) {
  const queryClient = useQueryClient()
  const removeMutation = useMutation({
    mutationFn: removeWorkspace,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY }),
  })

  return (
    <section className="wide-view">
      <div className="wide-heading">
        <div>
          <div className="eyebrow">WORKSPACES</div>
          <h1>工作空间</h1>
          <p>把临时浏览状态整理成可以反复恢复的项目空间。</p>
        </div>
        <button className="primary-button" type="button" onClick={() => onSave(tabs)} disabled={tabs.length === 0}>
          <Plus size={16} />
          保存当前标签
        </button>
      </div>

      {workspaces.length === 0 ? (
        <div className="workspace-empty">
          <FolderOpen size={22} />
          <strong>还没有工作空间</strong>
          <span>先把当前正在使用的一组标签保存下来。</span>
          <button type="button" className="primary-button" onClick={() => onSave(tabs)}>创建第一个工作空间</button>
        </div>
      ) : (
        <div className="workspace-grid">
          {workspaces.map((workspace) => (
            <article className="workspace-card" key={workspace.id}>
              <div className="workspace-card-head">
                <span className="workspace-glyph"><Layers3 size={16} /></span>
                <div>
                  <h2>{workspace.name}</h2>
                  <p>{workspace.tabs.length} Tabs · {relativeTime(workspace.updatedAt)}</p>
                </div>
              </div>
              <div className="workspace-preview">
                {workspace.tabs.slice(0, 5).map((tab) => (
                  <div className="workspace-preview-row" key={tab.id}>
                    <span>{hostnameFromUrl(tab.url).slice(0, 1).toUpperCase()}</span>
                    <p>{tab.title}</p>
                  </div>
                ))}
                {workspace.tabs.length > 5 ? <small>还有 {workspace.tabs.length - 5} 个标签</small> : null}
              </div>
              <div className="workspace-actions">
                <button className="primary-button compact" type="button" onClick={() => void restoreUrls(workspace.tabs.map((tab) => tab.url))}>
                  <ExternalLink size={14} />
                  在新窗口打开
                </button>
                <button className="icon-button danger" type="button" onClick={() => removeMutation.mutate(workspace.id)} title="删除工作空间">
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function DevicesView() {
  const platform = typeof navigator === 'undefined' ? '浏览器' : navigator.platform || '浏览器'

  return (
    <section className="wide-view devices-view">
      <div className="wide-heading">
        <div>
          <div className="eyebrow">DEVICES & SYNC</div>
          <h1>设备</h1>
          <p>当前阶段只保留产品结构，不连接后端。所有数据仍然只保存在本机。</p>
        </div>
        <span className="phase-badge">下一阶段接入账号</span>
      </div>

      <div className="devices-grid">
        <article className="device-card current">
          <div className="device-card-icon"><Monitor size={20} /></div>
          <div className="device-card-copy">
            <div className="device-title-row"><h2>当前设备</h2><span>Current</span></div>
            <p>{platform} · Chrome Extension</p>
            <small>工作空间使用 chrome.storage.local 保存</small>
          </div>
        </article>

        <article className="sync-intro-card">
          <div className="sync-intro-copy">
            <span className="sync-intro-icon"><Cloud size={20} /></span>
            <div>
              <h2>登录后跨设备继续工作</h2>
              <p>后续接入账号后，这里展示设备 Session、Workspace 同步和 Send to Device。</p>
            </div>
          </div>
          <div className="login-options">
            <button type="button"><span>G</span>使用 Google 登录</button>
            <button type="button"><span>GH</span>使用 GitHub 登录</button>
            <button type="button"><span>@</span>使用邮箱登录</button>
          </div>
          <div className="coming-note"><LogIn size={14} />静态交互已预留，当前不会发送任何账号数据。</div>
        </article>
      </div>
    </section>
  )
}

function SaveWorkspaceDialog({
  tabs,
  onClose,
  onSaved,
}: {
  tabs: BrowserTab[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const form = useForm({
    defaultValues: { name: '' },
    onSubmit: async ({ value }) => {
      await createWorkspace(value.name, tabs)
      await onSaved()
    },
  })

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="save-workspace-title">
        <div className="dialog-head">
          <div>
            <div className="eyebrow">SAVE WORKSPACE</div>
            <h2 id="save-workspace-title">保存 {tabs.length} 个标签</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose}><X size={16} /></button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <form.Field name="name">
            {(field) => (
              <label className="field-block">
                <span>工作空间名称</span>
                <input
                  autoFocus
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="例如：EdgeInfer 开发"
                />
              </label>
            )}
          </form.Field>
          <div className="dialog-preview">{tabs.slice(0, 4).map((tab) => <span key={tab.id}>{tab.title}</span>)}{tabs.length > 4 ? <small>+{tabs.length - 4}</small> : null}</div>
          <div className="dialog-actions">
            <button className="quiet-button" type="button" onClick={onClose}>取消</button>
            <button className="primary-button" type="submit">保存工作空间</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SelectionBar({ tabs, onSave, onDone }: { tabs: BrowserTab[]; onSave: () => void; onDone: () => void }) {
  const queryClient = useQueryClient()
  const closeMutation = useMutation({
    mutationFn: () => closeTabs(tabs.map((tab) => tab.id)),
    onSuccess: async () => {
      onDone()
      await queryClient.invalidateQueries({ queryKey: TABS_QUERY_KEY })
    },
  })

  return (
    <div className="selection-bar">
      <strong>已选择 {tabs.length} 个</strong>
      <span className="selection-divider" />
      <button type="button" onClick={onSave}><FolderOpen size={14} />保存</button>
      <button type="button" className="danger-text" onClick={() => closeMutation.mutate()}><Trash2 size={14} />关闭</button>
      <button className="selection-dismiss" type="button" onClick={onDone}><X size={14} /></button>
    </div>
  )
}

function CommandPalette({
  tabs,
  workspaces,
  onSave,
  onNavigate,
}: {
  tabs: BrowserTab[]
  workspaces: Workspace[]
  onSave: (tabs: BrowserTab[]) => void
  onNavigate: (view: WorkspaceView) => void
}) {
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLowerCase()
  const matchingTabs = tabs.filter((tab) => `${tab.title} ${tab.url}`.toLowerCase().includes(normalized)).slice(0, 6)
  const matchingWorkspaces = workspaces.filter((workspace) => workspace.name.toLowerCase().includes(normalized)).slice(0, 4)

  const run = (action: () => void | Promise<void>) => {
    setCommandOpen(false)
    void action()
  }

  return (
    <div className="command-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setCommandOpen(false)}>
      <div className="command-panel" role="dialog" aria-modal="true" aria-label="命令面板">
        <label className="command-search">
          <Search size={18} />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标签、工作空间或命令…" />
          <kbd>ESC</kbd>
        </label>

        <div className="command-results">
          {!normalized ? (
            <CommandGroup title="命令">
              <CommandItem icon={<FolderOpen size={15} />} title="保存当前标签为工作空间" hint="Workspace" onClick={() => run(() => onSave(tabs))} />
              <CommandItem icon={<Layers3 size={15} />} title="打开工作空间" hint="Navigation" onClick={() => run(() => onNavigate('workspaces'))} />
              <CommandItem icon={<Laptop size={15} />} title="查看设备" hint="Navigation" onClick={() => run(() => onNavigate('devices'))} />
            </CommandGroup>
          ) : null}

          {matchingTabs.length > 0 ? (
            <CommandGroup title="当前标签">
              {matchingTabs.map((tab) => (
                <CommandItem key={tab.id} icon={<span className="tiny-favicon">{hostnameFromUrl(tab.url).slice(0, 1).toUpperCase()}</span>} title={tab.title} hint={hostnameFromUrl(tab.url)} onClick={() => run(() => activateTab(tab))} />
              ))}
            </CommandGroup>
          ) : null}

          {matchingWorkspaces.length > 0 ? (
            <CommandGroup title="工作空间">
              {matchingWorkspaces.map((workspace) => (
                <CommandItem key={workspace.id} icon={<Layers3 size={15} />} title={workspace.name} hint={`${workspace.tabs.length} Tabs`} onClick={() => run(() => restoreUrls(workspace.tabs.map((tab) => tab.url)))} />
              ))}
            </CommandGroup>
          ) : null}

          {normalized && matchingTabs.length === 0 && matchingWorkspaces.length === 0 ? (
            <div className="command-empty">没有找到匹配内容。</div>
          ) : null}
        </div>
        <div className="command-footer"><Keyboard size={13} />Ctrl / ⌘ K 随时打开</div>
      </div>
    </div>
  )
}

function CommandGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="command-group"><h3>{title}</h3>{children}</section>
}

function CommandItem({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  hint: string
  onClick: () => void
}) {
  return (
    <button className="command-item" type="button" onClick={onClick}>
      <span className="command-item-icon">{icon}</span>
      <span>{title}</span>
      <small>{hint}</small>
    </button>
  )
}

function relativeTime(iso: string) {
  const delta = Date.now() - new Date(iso).getTime()
  const minutes = Math.max(0, Math.floor(delta / 60_000))
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(iso))
}
