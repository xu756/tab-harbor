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
          folderPath: path.filter(Boolean).join(' / ') || '书签',
          dateAdded: node.dateAdded,
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

  const listeners: Array<[chrome.events.Event<(...args: any[]) => void>, (...args: any[]) => void]> = []
  const add = (event: chrome.events.Event<(...args: any[]) => void> | undefined) => {
    if (!event?.addListener) return
    const listener = () => onChange()
    event.addListener(listener)
    listeners.push([event, listener])
  }

  add(chrome.tabs.onCreated as chrome.events.Event<(...args: any[]) => void>)
  add(chrome.tabs.onRemoved as chrome.events.Event<(...args: any[]) => void>)
  add(chrome.tabs.onUpdated as chrome.events.Event<(...args: any[]) => void>)
  add(chrome.tabs.onMoved as chrome.events.Event<(...args: any[]) => void>)
  add(chrome.tabs.onAttached as chrome.events.Event<(...args: any[]) => void>)
  add(chrome.tabs.onDetached as chrome.events.Event<(...args: any[]) => void>)
  add(chrome.tabs.onReplaced as chrome.events.Event<(...args: any[]) => void>)
  add(chrome.tabGroups.onCreated as chrome.events.Event<(...args: any[]) => void>)
  add(chrome.tabGroups.onUpdated as chrome.events.Event<(...args: any[]) => void>)
  add(chrome.tabGroups.onRemoved as chrome.events.Event<(...args: any[]) => void>)
  add(chrome.tabGroups.onMoved as chrome.events.Event<(...args: any[]) => void>)

  return () => listeners.forEach(([event, listener]) => event.removeListener(listener))
}

export function subscribeToBookmarkChanges(onChange: () => void) {
  if (!hasChromeRuntime() || !chrome.bookmarks) return () => undefined

  const events = [
    chrome.bookmarks.onCreated,
    chrome.bookmarks.onRemoved,
    chrome.bookmarks.onChanged,
    chrome.bookmarks.onMoved,
    chrome.bookmarks.onChildrenReordered,
    chrome.bookmarks.onImportEnded,
  ]
  const listener = () => onChange()
  events.forEach((event) => event.addListener(listener as never))
  return () => events.forEach((event) => event.removeListener(listener as never))
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
