import { demoTabs } from './demo-data'
import type { BrowserTab } from './types'

const NO_GROUP = -1

export function hasChromeRuntime() {
  return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id) && Boolean(chrome.tabs)
}

function isTabHarborUrl(url: string) {
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
    .filter((tab) => typeof tab.id === 'number' && Boolean(tab.url) && !isTabHarborUrl(tab.url ?? ''))
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

export function subscribeToTabChanges(onChange: () => void) {
  if (!hasChromeRuntime()) return () => undefined

  const listeners: Array<[chrome.events.Event<(...args: never[]) => void>, (...args: never[]) => void]> = []
  const bind = (event: chrome.events.Event<(...args: never[]) => void> | undefined) => {
    if (!event?.addListener) return
    const listener = (() => onChange()) as (...args: never[]) => void
    event.addListener(listener)
    listeners.push([event, listener])
  }

  bind(chrome.tabs.onCreated as never)
  bind(chrome.tabs.onRemoved as never)
  bind(chrome.tabs.onUpdated as never)
  bind(chrome.tabs.onMoved as never)
  bind(chrome.tabs.onAttached as never)
  bind(chrome.tabs.onDetached as never)
  bind(chrome.tabGroups?.onCreated as never)
  bind(chrome.tabGroups?.onUpdated as never)
  bind(chrome.tabGroups?.onRemoved as never)
  bind(chrome.tabGroups?.onMoved as never)

  return () => {
    for (const [event, listener] of listeners) event.removeListener(listener)
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
  if (active?.id) {
    await chrome.tabs.update(active.id, { url })
  } else {
    await chrome.tabs.create({ url })
  }
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
