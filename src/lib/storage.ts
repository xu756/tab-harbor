import type { BrowserTab, SavedTab, Workspace } from './types'
import { hasChromeRuntime } from './chrome'

const WORKSPACES_KEY = 'tabHarbor.workspaces.v2'

async function readValue<T>(key: string): Promise<T | undefined> {
  if (hasChromeRuntime()) {
    const value = await chrome.storage.local.get(key)
    return value[key] as T | undefined
  }

  const raw = window.localStorage.getItem(key)
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
  window.localStorage.setItem(key, JSON.stringify(value))
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const rows = (await readValue<Workspace[]>(WORKSPACES_KEY)) ?? []
  return [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
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
    name: name.trim() || `工作空间 ${current.length + 1}`,
    createdAt: now,
    updatedAt: now,
    tabs: tabs.map(toSavedTab),
  }

  await writeValue(WORKSPACES_KEY, [workspace, ...current])
  return workspace
}

export async function removeWorkspace(workspaceId: string) {
  const current = await listWorkspaces()
  await writeValue(
    WORKSPACES_KEY,
    current.filter((workspace) => workspace.id !== workspaceId),
  )
}
