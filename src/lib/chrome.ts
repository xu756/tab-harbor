import { normalizeBookmarkCatalog } from './bookmark-catalog'
import type { BookmarkNodeInput } from './bookmark-catalog'
import { countImportedNodes } from './bookmark-html'
import type { ImportedBookmarkNode } from './bookmark-html'
import { demoBookmarkTree, demoTabs } from './demo-data'
import type { BrowserBookmarkCatalog, BrowserTab } from './types'

const NO_GROUP = -1
let previewBookmarkSequence = 1_000
const previewBookmarkTree = structuredClone(demoBookmarkTree)

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

export async function queryBookmarks(): Promise<BrowserBookmarkCatalog> {
  if (!hasChromeRuntime() || !chrome.bookmarks?.getTree) {
    return normalizeBookmarkCatalog(previewBookmarkTree)
  }

  return normalizeBookmarkCatalog(await chrome.bookmarks.getTree())
}

function findPreviewNode(
  id: string,
  nodes: BookmarkNodeInput[] = previewBookmarkTree,
): { node: BookmarkNodeInput; siblings: BookmarkNodeInput[] } | undefined {
  for (const node of nodes) {
    if (node.id === id) return { node, siblings: nodes }
    const found = findPreviewNode(id, node.children ?? [])
    if (found) return found
  }
}

function reindex(nodes: BookmarkNodeInput[]) {
  nodes.forEach((node, index) => {
    node.index = index
  })
}

export async function updateBookmark(
  id: string,
  patch: { title: string; url: string },
): Promise<void> {
  if (hasChromeRuntime() && chrome.bookmarks?.update) {
    await chrome.bookmarks.update(id, patch)
    return
  }

  const match = findPreviewNode(id)
  if (!match?.node.url) throw new Error('找不到可编辑的书签')
  match.node.title = patch.title
  match.node.url = patch.url
}

export async function moveBookmark(
  id: string,
  destination: { parentId: string; index: number },
): Promise<void> {
  if (hasChromeRuntime() && chrome.bookmarks?.move) {
    await chrome.bookmarks.move(id, destination)
    return
  }

  const match = findPreviewNode(id)
  const parent = findPreviewNode(destination.parentId)?.node
  if (!match || !parent || parent.url) throw new Error('找不到书签或目标文件夹')

  const sourceIndex = match.siblings.indexOf(match.node)
  match.siblings.splice(sourceIndex, 1)
  reindex(match.siblings)

  const children = parent.children ?? (parent.children = [])
  const index = Math.max(0, Math.min(destination.index, children.length))
  match.node.parentId = parent.id
  children.splice(index, 0, match.node)
  reindex(children)
}

export interface BookmarkImportAdapter {
  create(details: {
    title: string
    parentId?: string
    url?: string
  }): Promise<{ id: string }>
  removeTree(id: string): Promise<void>
}

export async function runBookmarkImport(
  nodes: ImportedBookmarkNode[],
  adapter: BookmarkImportAdapter,
  onProgress: (done: number, total: number) => void,
  now = new Date(),
): Promise<string> {
  const total = countImportedNodes(nodes)
  let done = 0
  let rootId: string | undefined
  onProgress(done, total)

  const createNodes = async (
    children: ImportedBookmarkNode[],
    parentId: string,
  ) => {
    for (const child of children) {
      const created = await adapter.create({
        title: child.title,
        parentId,
        ...(child.kind === 'bookmark' ? { url: child.url } : {}),
      })
      done += 1
      onProgress(done, total)
      if (child.kind === 'folder') await createNodes(child.children, created.id)
    }
  }

  try {
    rootId = (
      await adapter.create({
        title: `导入的书签 · ${now.toISOString().slice(0, 10)}`,
      })
    ).id
    await createNodes(nodes, rootId)
    return rootId
  } catch (error) {
    if (rootId) {
      try {
        await adapter.removeTree(rootId)
      } catch {
        // Preserve the original import error when rollback also fails.
      }
    }
    throw error
  }
}

const chromeBookmarkImportAdapter: BookmarkImportAdapter = {
  async create(details) {
    return chrome.bookmarks.create(details)
  },
  async removeTree(id) {
    await chrome.bookmarks.removeTree(id)
  },
}

const previewBookmarkImportAdapter: BookmarkImportAdapter = {
  async create(details) {
    const parent = details.parentId
      ? findPreviewNode(details.parentId)?.node
      : findPreviewNode('2')?.node
    if (!parent || parent.url) throw new Error('找不到导入目标文件夹')

    const children = parent.children ?? (parent.children = [])
    const node: BookmarkNodeInput = {
      id: `preview-${previewBookmarkSequence++}`,
      title: details.title,
      parentId: parent.id,
      index: children.length,
      ...(details.url ? { url: details.url } : { children: [] }),
    }
    children.push(node)
    return { id: node.id }
  },
  async removeTree(id) {
    const match = findPreviewNode(id)
    if (!match) return
    match.siblings.splice(match.siblings.indexOf(match.node), 1)
    reindex(match.siblings)
  },
}

export async function importBookmarkNodes(
  nodes: ImportedBookmarkNode[],
  onProgress: (done: number, total: number) => void,
) {
  return runBookmarkImport(
    nodes,
    hasChromeRuntime()
      ? chromeBookmarkImportAdapter
      : previewBookmarkImportAdapter,
    onProgress,
  )
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
