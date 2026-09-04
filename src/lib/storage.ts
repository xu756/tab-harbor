import { defaultQuickLinks } from './demo-data'
import type {
  BrowserTab,
  MockUserSession,
  QuickLink,
  SavedTab,
  TodoItem,
  UserPreferences,
  Workspace,
} from './types'
import { hasChromeRuntime } from './chrome'

const WORKSPACES_KEY = 'harbor.workspaces.v3'
const LEGACY_WORKSPACES_KEY = 'tabHarbor.workspaces.v2'
const QUICK_LINKS_KEY = 'harbor.quickLinks.v1'
const TODOS_KEY = 'harbor.todos.v1'
const PREFERENCES_KEY = 'harbor.preferences.v1'
const AUTH_SESSION_KEY = 'harbor.auth_session.v1'

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultSearchEngine: 'baidu',
  clockFormat: '24h',
  showClockSeconds: true,
  focusMode: false,
}

const DEFAULT_SESSION: MockUserSession = {
  isLoggedIn: false,
  autoSyncEnabled: false,
}


const memoryStore = new Map<string, string>()

export function clearStorageForTest() {
  memoryStore.clear()
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear()
  }
}

async function readValue<T>(key: string): Promise<T | undefined> {
  if (hasChromeRuntime()) {
    const value = await chrome.storage.local.get(key)
    return value[key] as T | undefined
  }

  const raw =
    typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem(key)
      : memoryStore.get(key)
  if (!raw) return undefined
  try {
    return JSON.parse(raw) as T
  } catch {
    return undefined
  }
}

async function writeValue<T>(key: string, value: T) {
  if (hasChromeRuntime()) {
    await chrome.storage.local.set({ [key]: value })
    return
  }
  const serialized = JSON.stringify(value)
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(key, serialized)
    return
  }
  memoryStore.set(key, serialized)
}


export async function listWorkspaces(): Promise<Workspace[]> {
  let rows = await readValue<Workspace[]>(WORKSPACES_KEY)
  if (!rows) {
    const legacy = await readValue<Workspace[]>(LEGACY_WORKSPACES_KEY)
    if (legacy) {
      rows = legacy
      await writeValue(WORKSPACES_KEY, legacy)
    }
  }
  return [...(rows ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

function toSavedTab(tab: BrowserTab, order: number): SavedTab {
  return {
    id: crypto.randomUUID(),
    title: tab.title,
    url: tab.url,
    favIconUrl: tab.favIconUrl,
    pinned: tab.pinned,
    groupName: tab.groupTitle,
    order,
  }
}

export async function createWorkspace(name: string, tabs: BrowserTab[]) {
  const current = await listWorkspaces()
  const now = new Date().toISOString()
  const workspace: Workspace = {
    id: crypto.randomUUID(),
    name: name.trim() || `工作区 ${current.length + 1}`,
    createdAt: now,
    updatedAt: now,
    tabs: tabs.map(toSavedTab),
  }
  await writeValue(WORKSPACES_KEY, [workspace, ...current])
  return workspace
}

export async function renameWorkspace(workspaceId: string, name: string) {
  const current = await listWorkspaces()
  const next = current.map((workspace) =>
    workspace.id === workspaceId
      ? { ...workspace, name: name.trim() || workspace.name, updatedAt: new Date().toISOString() }
      : workspace,
  )
  await writeValue(WORKSPACES_KEY, next)
}

export async function removeWorkspace(workspaceId: string) {
  const current = await listWorkspaces()
  await writeValue(WORKSPACES_KEY, current.filter((workspace) => workspace.id !== workspaceId))
}

export async function listQuickLinks(): Promise<QuickLink[]> {
  const rows = await readValue<QuickLink[]>(QUICK_LINKS_KEY)
  return rows ?? defaultQuickLinks
}

export async function saveQuickLink(input: Omit<QuickLink, 'id'> & { id?: string }) {
  const current = await listQuickLinks()
  const row: QuickLink = {
    id: input.id ?? crypto.randomUUID(),
    title: input.title.trim(),
    url: input.url.trim(),
    label: input.label.trim() || input.title.trim().slice(0, 2).toUpperCase(),
  }
  const exists = current.some((item) => item.id === row.id)
  await writeValue(
    QUICK_LINKS_KEY,
    exists ? current.map((item) => (item.id === row.id ? row : item)) : [...current, row],
  )
  return row
}

export async function removeQuickLink(id: string) {
  const current = await listQuickLinks()
  await writeValue(QUICK_LINKS_KEY, current.filter((item) => item.id !== id))
}

export async function listTodos(): Promise<TodoItem[]> {
  const rows = (await readValue<TodoItem[]>(TODOS_KEY)) ?? []
  return [...rows].sort((a, b) => Number(a.completed) - Number(b.completed) || b.createdAt.localeCompare(a.createdAt))
}

export async function createTodo(text: string) {
  const value = text.trim()
  if (!value) return null
  const current = await listTodos()
  const now = new Date().toISOString()
  const item: TodoItem = { id: crypto.randomUUID(), text: value, completed: false, createdAt: now, updatedAt: now }
  await writeValue(TODOS_KEY, [item, ...current])
  return item
}

export async function updateTodo(id: string, patch: Partial<Pick<TodoItem, 'text' | 'completed'>>) {
  const current = await listTodos()
  const next = current.map((item) =>
    item.id === id
      ? { ...item, ...patch, text: patch.text?.trim() || item.text, updatedAt: new Date().toISOString() }
      : item,
  )
  await writeValue(TODOS_KEY, next)
}

export async function removeTodo(id: string) {
  const current = await listTodos()
  await writeValue(TODOS_KEY, current.filter((item) => item.id !== id))
}

export async function clearCompletedTodos() {
  const current = await listTodos()
  await writeValue(TODOS_KEY, current.filter((item) => !item.completed))
}

export async function getPreferences(): Promise<UserPreferences> {
  const val = await readValue<UserPreferences>(PREFERENCES_KEY)
  return { ...DEFAULT_PREFERENCES, ...(val ?? {}) }
}

export async function updatePreferences(patch: Partial<UserPreferences>): Promise<UserPreferences> {
  const current = await getPreferences()
  const next = { ...current, ...patch }
  await writeValue(PREFERENCES_KEY, next)
  return next
}

export async function getSession(): Promise<MockUserSession> {
  const val = await readValue<MockUserSession>(AUTH_SESSION_KEY)
  return { ...DEFAULT_SESSION, ...(val ?? {}) }
}

export async function mockLogin(email: string, name?: string): Promise<MockUserSession> {
  const session: MockUserSession = {
    isLoggedIn: true,
    user: {
      id: crypto.randomUUID(),
      email: email.trim(),
      name: name?.trim() || email.split('@')[0],
      plan: 'free',
      joinedAt: new Date().toISOString(),
    },
    autoSyncEnabled: true,
    lastSyncedAt: new Date().toISOString(),
  }
  await writeValue(AUTH_SESSION_KEY, session)
  return session
}

export async function mockLogout(): Promise<MockUserSession> {
  await writeValue(AUTH_SESSION_KEY, DEFAULT_SESSION)
  return DEFAULT_SESSION
}

export async function mockTriggerSync(): Promise<{ success: boolean; syncedAt: string }> {
  const current = await getSession()
  const syncedAt = new Date().toISOString()
  if (current.isLoggedIn) {
    await writeValue(AUTH_SESSION_KEY, { ...current, lastSyncedAt: syncedAt })
  }
  return { success: true, syncedAt }
}

