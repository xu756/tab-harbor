import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Bookmark,
  FolderOpen,
  Layers3,
  LayoutGrid,
  Settings,
  SquareStack,
  Trash2,
  X,
} from 'lucide-react'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  closeTabs,
  openUrlInNewTab,
  queryBookmarks,
  queryLiveTabs,
  restoreUrls,
  subscribeToBookmarkChanges,
  subscribeToTabChanges,
} from '@/lib/chrome'
import {
  createWorkspace,
  exportHarborBackup,
  getPreferences,
  getSession,
  importHarborBackup,
  listQuickLinks,
  listTodos,
  listWorkspaces,
  mockLogin,
  mockLogout,
  mockTriggerSync,
  renameWorkspace,
  resetAllData,
  saveQuickLink,
  updatePreferences,
} from '@/lib/storage'
import type {
  BrowserBookmarkCatalog,
  BrowserTab,
  HarborBackupData,
  MockUserSession,
  QuickLink,
  TodoItem,
  UserPreferences,
  Workspace,
} from '@/lib/types'
import {
  setCommandOpen,
  setSelectedTabIds,
  setSettingsOpen,
  useUiStore,
} from '@/state/ui-store'

export const tabsQueryKey = ['live-tabs'] as const
export const bookmarksQueryKey = ['bookmarks'] as const
export const workspacesQueryKey = ['workspaces'] as const
export const quickLinksQueryKey = ['quick-links'] as const
export const todosQueryKey = ['todos'] as const
export const preferencesQueryKey = ['preferences'] as const
export const sessionQueryKey = ['auth-session'] as const

interface QuickLinkDraft {
  id?: string
  title: string
  url: string
  label: string
}

interface AppContextValue {
  tabs: BrowserTab[]
  bookmarkCatalog: BrowserBookmarkCatalog
  workspaces: Workspace[]
  quickLinks: QuickLink[]
  todos: TodoItem[]
  preferences: UserPreferences
  session: MockUserSession
  loadingTabs: boolean
  loadingBookmarks: boolean
  openSaveWorkspace: (tabs: BrowserTab[]) => void
  openQuickLinkEditor: (link?: QuickLink) => void
  openRenameWorkspace: (workspace: Workspace) => void
  updatePreferences: (patch: Partial<UserPreferences>) => Promise<UserPreferences>
  login: (email: string, name?: string) => Promise<MockUserSession>
  logout: () => Promise<MockUserSession>
  triggerSync: () => Promise<{ success: boolean; syncedAt: string }>
  exportBackup: () => Promise<HarborBackupData>
  importBackup: (
    data: HarborBackupData,
    mode: 'merge' | 'replace',
  ) => Promise<{ success: boolean; workspacesCount: number; quickLinksCount: number; todosCount: number }>
  resetData: () => Promise<void>
}


const AppContext = createContext<AppContextValue | null>(null)

export function useApp() {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used inside AppProvider')
  return value
}

export function AppProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const selectedTabIds = useUiStore((state) => state.selectedTabIds)
  const commandOpen = useUiStore((state) => state.commandOpen)
  const settingsOpen = useUiStore((state) => state.settingsOpen)
  const theme = useUiStore((state) => state.theme)
  const [saveCandidate, setSaveCandidate] = useState<BrowserTab[] | null>(null)
  const [quickLinkDraft, setQuickLinkDraft] = useState<QuickLinkDraft | null>(null)
  const [renameTarget, setRenameTarget] = useState<Workspace | null>(null)

  const tabsQuery = useQuery({ queryKey: tabsQueryKey, queryFn: queryLiveTabs })
  const bookmarksQuery = useQuery({ queryKey: bookmarksQueryKey, queryFn: queryBookmarks })
  const workspacesQuery = useQuery({ queryKey: workspacesQueryKey, queryFn: listWorkspaces })
  const quickLinksQuery = useQuery({ queryKey: quickLinksQueryKey, queryFn: listQuickLinks })
  const todosQuery = useQuery({ queryKey: todosQueryKey, queryFn: listTodos })
  const preferencesQuery = useQuery({ queryKey: preferencesQueryKey, queryFn: getPreferences })
  const sessionQuery = useQuery({ queryKey: sessionQueryKey, queryFn: getSession })

  const updatePreferencesMutation = useMutation({
    mutationFn: updatePreferences,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: preferencesQueryKey })
    },
  })

  const loginMutation = useMutation({
    mutationFn: ({ email, name }: { email: string; name?: string }) => mockLogin(email, name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey })
    },
  })

  const logoutMutation = useMutation({
    mutationFn: mockLogout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey })
    },
  })

  const triggerSyncMutation = useMutation({
    mutationFn: mockTriggerSync,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey })
    },
  })

  const importBackupMutation = useMutation({
    mutationFn: ({ data, mode }: { data: HarborBackupData; mode: 'merge' | 'replace' }) =>
      importHarborBackup(data, mode),
    onSuccess: async () => {
      await queryClient.invalidateQueries()
    },
  })

  const resetDataMutation = useMutation({
    mutationFn: resetAllData,
    onSuccess: async () => {
      await queryClient.invalidateQueries()
    },
  })

  useEffect(
    () => subscribeToTabChanges(() => void queryClient.invalidateQueries({ queryKey: tabsQueryKey })),
    [queryClient],
  )
  useEffect(
    () => subscribeToBookmarkChanges(() => void queryClient.invalidateQueries({ queryKey: bookmarksQueryKey })),
    [queryClient],
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    }
    applyTheme()
    media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [theme])

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(!commandOpen)
      }
      if ((event.metaKey || event.ctrlKey) && event.key === ',') {
        event.preventDefault()
        setSettingsOpen(!settingsOpen)
      }
      if (event.key === 'Escape') {
        if (commandOpen) setCommandOpen(false)
        if (settingsOpen) setSettingsOpen(false)
      }
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [commandOpen, settingsOpen])

  const tabs = tabsQuery.data ?? []
  const bookmarkCatalog = bookmarksQuery.data ?? { folders: [], bookmarks: [] }
  const workspaces = workspacesQuery.data ?? []
  const quickLinks = quickLinksQuery.data ?? []
  const todos = todosQuery.data ?? []
  const preferences = preferencesQuery.data ?? {
    defaultSearchEngine: 'baidu',
    clockFormat: '24h',
    showClockSeconds: true,
    focusMode: false,
  }
  const session = sessionQuery.data ?? {
    isLoggedIn: false,
    autoSyncEnabled: false,
  }
  const selectedTabs = tabs.filter((tab) => selectedTabIds.includes(tab.id))

  const value = useMemo<AppContextValue>(() => ({
    tabs,
    bookmarkCatalog,
    workspaces,
    quickLinks,
    todos,
    preferences,
    session,
    loadingTabs: tabsQuery.isLoading,
    loadingBookmarks: bookmarksQuery.isLoading,
    openSaveWorkspace: setSaveCandidate,
    openQuickLinkEditor: (link) => setQuickLinkDraft(
      link
        ? { id: link.id, title: link.title, url: link.url, label: link.label }
        : { title: '', url: '', label: '' },
    ),
    openRenameWorkspace: setRenameTarget,
    updatePreferences: (patch) => updatePreferencesMutation.mutateAsync(patch),
    login: (email, name) => loginMutation.mutateAsync({ email, name }),
    logout: () => logoutMutation.mutateAsync(),
    triggerSync: () => triggerSyncMutation.mutateAsync(),
    exportBackup: exportHarborBackup,
    importBackup: (data, mode) => importBackupMutation.mutateAsync({ data, mode }),
    resetData: () => resetDataMutation.mutateAsync(),
  }), [
    bookmarkCatalog,
    bookmarksQuery.isLoading,
    importBackupMutation,
    loginMutation,
    logoutMutation,
    preferences,
    quickLinks,
    resetDataMutation,
    session,
    tabs,
    tabsQuery.isLoading,
    todos,
    triggerSyncMutation,
    updatePreferencesMutation,
    workspaces,
  ])

  return (

    <TooltipProvider>
      <AppContext.Provider value={value}>
        {children}
        {selectedTabs.length > 0 ? (
          <SelectionBar tabs={selectedTabs} onSave={() => setSaveCandidate(selectedTabs)} />
        ) : null}
        <SaveWorkspaceDialog
          key={saveCandidate ? 'save-open' : 'save-closed'}
          tabs={saveCandidate}
          onClose={() => setSaveCandidate(null)}
        />
        <QuickLinkDialog
          key={quickLinkDraft?.id ?? (quickLinkDraft ? 'quick-new' : 'quick-closed')}
          initial={quickLinkDraft}
          onClose={() => setQuickLinkDraft(null)}
        />
        <RenameWorkspaceDialog
          key={renameTarget?.id ?? 'rename-closed'}
          workspace={renameTarget}
          onClose={() => setRenameTarget(null)}
        />
        <GlobalCommandMenu
          open={commandOpen}
          onOpenChange={setCommandOpen}
          tabs={tabs}
          bookmarks={bookmarkCatalog.bookmarks}
          workspaces={workspaces}
          onSave={setSaveCandidate}
        />
      </AppContext.Provider>
    </TooltipProvider>
  )
}

function SaveWorkspaceDialog({ tabs, onClose }: { tabs: BrowserTab[] | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const form = useForm({
    defaultValues: { name: '' },
    onSubmit: async ({ value }) => {
      if (!tabs) return
      await createWorkspace(value.name, tabs)
      onClose()
      setSelectedTabIds([])
      await queryClient.invalidateQueries({ queryKey: workspacesQueryKey })
    },
  })

  return (
    <Dialog open={Boolean(tabs)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>保存为工作区</DialogTitle>
          <DialogDescription>{tabs?.length ?? 0} 个标签会保存在本机。</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => { event.preventDefault(); void form.handleSubmit() }}>
          <FieldGroup>
            <form.Field name="name">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="workspace-name">名称</FieldLabel>
                  <Input
                    id="workspace-name"
                    autoFocus
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="例如：本周开发"
                  />
                </Field>
              )}
            </form.Field>
          </FieldGroup>
          <DialogFooter className="mt-5">
            <Button variant="outline" type="button" onClick={onClose}>取消</Button>
            <Button type="submit">保存工作区</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function QuickLinkDialog({ initial, onClose }: { initial: QuickLinkDraft | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const form = useForm({
    defaultValues: {
      title: initial?.title ?? '',
      url: initial?.url ?? '',
      label: initial?.label ?? '',
    },
    onSubmit: async ({ value }) => {
      if (!initial || !value.title.trim() || !value.url.trim()) return
      const url = /^https?:\/\//i.test(value.url) ? value.url : `https://${value.url}`
      await saveQuickLink({ id: initial.id, title: value.title, url, label: value.label })
      onClose()
      await queryClient.invalidateQueries({ queryKey: quickLinksQueryKey })
    },
  })

  return (
    <Dialog open={Boolean(initial)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial?.id ? '编辑快捷入口' : '添加快捷入口'}</DialogTitle>
          <DialogDescription>快捷入口只保存在当前浏览器。</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => { event.preventDefault(); void form.handleSubmit() }}>
          <FieldGroup>
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <form.Field name="title">
                {(field) => <Field><FieldLabel htmlFor="link-title">名称</FieldLabel><Input id="link-title" autoFocus value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} placeholder="GitHub" /></Field>}
              </form.Field>
              <form.Field name="label">
                {(field) => <Field><FieldLabel htmlFor="link-label">缩写</FieldLabel><Input id="link-label" maxLength={3} value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} placeholder="GH" /></Field>}
              </form.Field>
            </div>
            <form.Field name="url">
              {(field) => <Field><FieldLabel htmlFor="link-url">网址</FieldLabel><Input id="link-url" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} placeholder="https://github.com" /></Field>}
            </form.Field>
          </FieldGroup>
          <DialogFooter className="mt-5">
            <Button variant="outline" type="button" onClick={onClose}>取消</Button>
            <Button type="submit">保存</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RenameWorkspaceDialog({ workspace, onClose }: { workspace: Workspace | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const form = useForm({
    defaultValues: { name: workspace?.name ?? '' },
    onSubmit: async ({ value }) => {
      if (!workspace) return
      await renameWorkspace(workspace.id, value.name)
      onClose()
      await queryClient.invalidateQueries({ queryKey: workspacesQueryKey })
    },
  })

  return (
    <Dialog open={Boolean(workspace)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重命名工作区</DialogTitle>
          <DialogDescription>{workspace?.tabs.length ?? 0} 个标签。</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => { event.preventDefault(); void form.handleSubmit() }}>
          <form.Field name="name">
            {(field) => <Field><FieldLabel htmlFor="rename-workspace">名称</FieldLabel><Input id="rename-workspace" autoFocus value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} /></Field>}
          </form.Field>
          <DialogFooter className="mt-5">
            <Button variant="outline" type="button" onClick={onClose}>取消</Button>
            <Button type="submit">保存</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SelectionBar({ tabs, onSave }: { tabs: BrowserTab[]; onSave: () => void }) {
  const queryClient = useQueryClient()
  const closeMutation = useMutation({
    mutationFn: () => closeTabs(tabs.map((tab) => tab.id)),
    onSuccess: async () => {
      setSelectedTabIds([])
      await queryClient.invalidateQueries({ queryKey: tabsQueryKey })
    },
  })

  return (
    <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border bg-popover p-2 pl-4 text-sm text-popover-foreground shadow-lg animate-in fade-in slide-in-from-bottom-2">
      <strong>{tabs.length} 个已选</strong>
      <Button size="sm" onClick={onSave}><FolderOpen data-icon="inline-start" />保存</Button>
      <Button size="sm" variant="destructive" onClick={() => closeMutation.mutate()}><Trash2 data-icon="inline-start" />关闭</Button>
      <Button size="icon-sm" variant="ghost" onClick={() => setSelectedTabIds([])} aria-label="取消选择"><X /></Button>
    </div>
  )
}

function GlobalCommandMenu({ open, onOpenChange, tabs, bookmarks, workspaces, onSave }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tabs: BrowserTab[]
  bookmarks: BrowserBookmarkCatalog['bookmarks']
  workspaces: Workspace[]
  onSave: (tabs: BrowserTab[]) => void
}) {
  const navigate = useNavigate()
  const closeAndRun = (action: () => void | Promise<void>) => {
    onOpenChange(false)
    void action()
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="搜索与命令" description="搜索标签、书签、工作区或切换页面。">
      <CommandInput autoFocus placeholder="搜索标签、书签、工作区或命令…" />
      <CommandList>
        <CommandEmpty>没有找到匹配项。</CommandEmpty>
        <CommandGroup heading="页面">
          <CommandItem onSelect={() => closeAndRun(() => navigate({ to: '/' }))}><LayoutGrid />首页<CommandShortcut>G H</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => closeAndRun(() => navigate({ to: '/tabs' }))}><SquareStack />标签<CommandShortcut>G T</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => closeAndRun(() => navigate({ to: '/bookmarks' }))}><Bookmark />书签<CommandShortcut>G B</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => closeAndRun(() => navigate({ to: '/workspaces' }))}><Layers3 />工作区<CommandShortcut>G W</CommandShortcut></CommandItem>
        </CommandGroup>
        <CommandGroup heading="操作">
          <CommandItem onSelect={() => closeAndRun(() => onSave(tabs))}><FolderOpen />保存当前标签</CommandItem>
          <CommandItem onSelect={() => closeAndRun(() => setSettingsOpen(true))}><Settings />偏好设置与账户<CommandShortcut>⌘,</CommandShortcut></CommandItem>
        </CommandGroup>

        {tabs.length ? <CommandGroup heading="标签">{tabs.slice(0, 8).map((tab) => <CommandItem key={tab.id} value={`${tab.title} ${tab.url}`} onSelect={() => closeAndRun(() => openUrlInNewTab(tab.url))}><SquareStack />{tab.title}</CommandItem>)}</CommandGroup> : null}
        {bookmarks.length ? <CommandGroup heading="书签">{bookmarks.slice(0, 8).map((bookmark) => <CommandItem key={bookmark.id} value={`${bookmark.title} ${bookmark.url}`} onSelect={() => closeAndRun(() => openUrlInNewTab(bookmark.url))}><Bookmark />{bookmark.title}</CommandItem>)}</CommandGroup> : null}
        {workspaces.length ? <CommandGroup heading="工作区">{workspaces.slice(0, 6).map((workspace) => <CommandItem key={workspace.id} value={workspace.name} onSelect={() => closeAndRun(() => restoreUrls(workspace.tabs.map((tab) => tab.url)))}><Layers3 />{workspace.name}</CommandItem>)}</CommandGroup> : null}
      </CommandList>
    </CommandDialog>
  )
}
