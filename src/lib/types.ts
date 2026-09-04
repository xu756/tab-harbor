export type WorkspaceView = 'home' | 'tabs' | 'bookmarks' | 'workspaces'

export interface BrowserTab {
  id: number
  windowId: number
  index: number
  title: string
  url: string
  favIconUrl?: string
  active: boolean
  pinned: boolean
  audible: boolean
  discarded: boolean
  groupId: number
  groupTitle?: string
  groupColor?: string
  incognito: boolean
}

export interface BrowserBookmark {
  id: string
  title: string
  url: string
  parentId: string
  index: number
  folderPath: string
  dateAdded?: number
  unmodifiable: boolean
}

export interface BrowserBookmarkFolder {
  id: string
  title: string
  parentId?: string
  index: number
  folderType?: string
  unmodifiable: boolean
  path: string[]
  children: BrowserBookmarkFolder[]
  bookmarkCount: number
}

export interface BrowserBookmarkCatalog {
  folders: BrowserBookmarkFolder[]
  bookmarks: BrowserBookmark[]
}

export interface SavedTab {
  id: string
  title: string
  url: string
  favIconUrl?: string
  pinned: boolean
  groupName?: string
  order: number
}

export interface Workspace {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  tabs: SavedTab[]
}

export interface QuickLink {
  id: string
  title: string
  url: string
  label: string
}

export interface TodoItem {
  id: string
  text: string
  completed: boolean
  createdAt: string
  updatedAt: string
}

export interface TabGroupBucket {
  key: string
  title: string
  tabs: BrowserTab[]
  color?: string
}

export type ClockFormat = '24h' | '12h'

export interface UserPreferences {
  defaultSearchEngine: string
  clockFormat: ClockFormat
  showClockSeconds: boolean
  focusMode: boolean
}

export interface MockUserSession {
  isLoggedIn: boolean
  user?: {
    id: string
    email: string
    name: string
    avatarUrl?: string
    plan: 'free' | 'pro'
    joinedAt: string
  }
  lastSyncedAt?: string
  autoSyncEnabled: boolean
}

export interface HarborBackupData {
  version: 1
  exportedAt: string
  workspaces: Workspace[]
  quickLinks: QuickLink[]
  todos: TodoItem[]
  preferences: UserPreferences
}

