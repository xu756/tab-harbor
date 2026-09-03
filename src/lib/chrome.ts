import { demoBookmarks, demoTabs } from './demo-data'
import type { BrowserBookmark, BrowserTab } from './types'

const NO_GROUP = -1

export function hasChromeRuntime() {
  return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id) && Boolean(chrome.tabs)
}

function isHarborUrl(url: string) {
  if (!hasChromeRuntime()) return false
  const root = chrome.runtime.getURL('index.html')
  return url === root || url.startsWith(`${root}?`) || url === 'chrome://newtab/'
}

function safeTitle(tab: chrome.tabs.Tab) {
  return tab.title?.trim() || tab.url || 'Untitled'
}

export async function queryLiveTabs(): Promise<BrowserTab[]> {
  if (!hasChromeRuntime()) return demoTabs

  const tabs = await chrome.tabs.query({})
  const groupIds = [...new Set(tabs.map((tab) => tab.groupId).filter((id) => typeof id === 'number' && id >= 0))]
  const groupMap = new Map<number, chrome.tabGroups.TabGroup>()

  await Promise.all(
    groupIds.map(async (groupId) => {
      try {
        groupMap.set(groupId, await chrome.tabGroups.get(groupId))
      } catch {
        // A group can disappear while tabs are being queried.
      }
    }),
  )

  return tabs
    .filter((tab) => typeof tab.id === 'number' && Boolean(tab.url) && !isHarborUrl(tab.url ?? ''))
    .map((tab) => {
      const group = typeof tab.groupId === 'number' ? groupMap.get(tab.groupId) : undefined
      return {
        id: tab.id!,
        windowId: tab.windowId,
        index: tab.index,
        title: safeTitle(tab),
        url: tab.url ?? '',
        favIconUrl: tab.favIconUrl,
        active: Boolean(tab.active),
        pinned: Boolean(tab.pinned),
        audible: Boolean(tab.audible),
        discarded: Boolean(tab.discarded),
        groupId: tab.groupId ?? NO_GROUP,
        groupTitle: group?.title || undefined,
        groupColor: group?.color,
        incognito: Boolean(tab.incognito),
      }
    })
    .filter((tab) => !tab.incognito)
}

export async function queryBookmarks(): Promise<BrowserBookmark[]> {
  if (!hasChromeRuntime() || !chrome.bookmarks?.getTree) return demoBookmarks

  const roots = await chrome.bookmarks.getTree()
  const rows: BrowserBookmark[] = []

  const visit = (nodes: chrome.bookmarks.BookmarkTreeNode[], path: string[]) => {
    for (const node of nodes) {
      if (node.url) {
        rows.push({
          id: node.id,
          title: node.title?.trim() || node.url,
          url: node.url,
          parentId: node.parentId ?? '',
          index: node.index ?? 0,
          folderPath: path.filter(Boolean).join(' / ') || '书签',
          dateAdded: node.dateAdded,
          unmodifiable: Boolean(node.unmodifiable),
        })
        continue
      }

      const nextPath = node.title ? [...path, node.title] : path
      if (node.children?.length) visit(node.children, nextPath)
    }
  }

  visit(roots, [])
  return rows
}

export function subscribeToTabChanges(onChange: () => void) {
  if (!hasChromeRuntime()) return () => undefined

  const onCreated = () => onChange()
  const onRemoved = () => onChange()
  const onUpdated = () => onChange()
  const onMoved = () => onChange()
  const onAttached = () => onChange()
  const onDetached = () => onChange()
  const onReplaced = () => onChange()
  const onGroupCreated = () => onChange()
  const onGroupUpdated = () => onChange()
  const onGroupRemoved = () => onChange()
  const onGroupMoved = () => onChange()

  chrome.tabs.onCreated.addListener(onCreated)
  chrome.tabs.onRemoved.addListener(onRemoved)
  chrome.tabs.onUpdated.addListener(onUpdated)
  chrome.tabs.onMoved.addListener(onMoved)
  chrome.tabs.onAttached.addListener(onAttached)
  chrome.tabs.onDetached.addListener(onDetached)
  chrome.tabs.onReplaced.addListener(onReplaced)
  chrome.tabGroups.onCreated.addListener(onGroupCreated)
  chrome.tabGroups.onUpdated.addListener(onGroupUpdated)
  chrome.tabGroups.onRemoved.addListener(onGroupRemoved)
  chrome.tabGroups.onMoved.addListener(onGroupMoved)

  return () => {
    chrome.tabs.onCreated.removeListener(onCreated)
    chrome.tabs.onRemoved.removeListener(onRemoved)
    chrome.tabs.onUpdated.removeListener(onUpdated)
    chrome.tabs.onMoved.removeListener(onMoved)
    chrome.tabs.onAttached.removeListener(onAttached)
    chrome.tabs.onDetached.removeListener(onDetached)
    chrome.tabs.onReplaced.removeListener(onReplaced)
    chrome.tabGroups.onCreated.removeListener(onGroupCreated)
    chrome.tabGroups.onUpdated.removeListener(onGroupUpdated)
    chrome.tabGroups.onRemoved.removeListener(onGroupRemoved)
    chrome.tabGroups.onMoved.removeListener(onGroupMoved)
  }
}

export function subscribeToBookmarkChanges(onChange: () => void) {
  if (!hasChromeRuntime() || !chrome.bookmarks) return () => undefined

  const onCreated = () => onChange()
  const onRemoved = () => onChange()
  const onChanged = () => onChange()
  const onMoved = () => onChange()
  const onChildrenReordered = () => onChange()
  const onImportEnded = () => onChange()

  chrome.bookmarks.onCreated.addListener(onCreated)
  chrome.bookmarks.onRemoved.addListener(onRemoved)
  chrome.bookmarks.onChanged.addListener(onChanged)
  chrome.bookmarks.onMoved.addListener(onMoved)
  chrome.bookmarks.onChildrenReordered.addListener(onChildrenReordered)
  chrome.bookmarks.onImportEnded.addListener(onImportEnded)

  return () => {
    chrome.bookmarks.onCreated.removeListener(onCreated)
    chrome.bookmarks.onRemoved.removeListener(onRemoved)
    chrome.bookmarks.onChanged.removeListener(onChanged)
    chrome.bookmarks.onMoved.removeListener(onMoved)
    chrome.bookmarks.onChildrenReordered.removeListener(onChildrenReordered)
    chrome.bookmarks.onImportEnded.removeListener(onImportEnded)
  }
}

export async function activateTab(tab: BrowserTab) {
  if (!hasChromeRuntime()) {
    window.open(tab.url, '_blank', 'noopener,noreferrer')
    return
  }

  await chrome.tabs.update(tab.id, { active: true })
  await chrome.windows.update(tab.windowId, { focused: true })
}

export async function closeTabs(tabIds: number[]) {
  if (!hasChromeRuntime() || tabIds.length === 0) return
  await chrome.tabs.remove(tabIds)
}

export async function openUrl(url: string) {
  if (!hasChromeRuntime()) {
    window.location.assign(url)
    return
  }

  const [active] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (active?.id) await chrome.tabs.update(active.id, { url })
  else await chrome.tabs.create({ url })
}

export async function openUrlInNewTab(url: string) {
  if (!hasChromeRuntime()) {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  await chrome.tabs.create({ url })
}

export async function openBookmarksManager() {
  if (!hasChromeRuntime()) return
  await chrome.tabs.create({ url: 'chrome://bookmarks/' })
}

export async function restoreUrls(urls: string[]) {
  const safeUrls = urls.filter(Boolean)
  if (safeUrls.length === 0) return

  if (!hasChromeRuntime()) {
    safeUrls.slice(0, 5).forEach((url) => window.open(url, '_blank', 'noopener,noreferrer'))
    return
  }

  await chrome.windows.create({ url: safeUrls })
}

export function faviconUrlForPage(url: string, size = 32) {
  if (!hasChromeRuntime()) return ''
  return chrome.runtime.getURL(`_favicon/?pageUrl=${encodeURIComponent(url)}&size=${size}`)
}

export function hostnameFromUrl(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, '') || parsed.protocol.replace(':', '')
  } catch {
    return '其他'
  }
}

export function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url)
    parsed.hash = ''
    if (parsed.pathname !== '/') parsed.pathname = parsed.pathname.replace(/\/$/, '')
    return parsed.toString()
  } catch {
    return url
  }
}
