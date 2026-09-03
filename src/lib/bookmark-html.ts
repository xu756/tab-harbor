import { flattenCatalogFolders } from './bookmark-catalog'
import type {
  BrowserBookmark,
  BrowserBookmarkCatalog,
  BrowserBookmarkFolder,
} from './types'

export interface ImportedBookmarkFolder {
  kind: 'folder'
  title: string
  children: ImportedBookmarkNode[]
}

export interface ImportedBookmarkLink {
  kind: 'bookmark'
  title: string
  url: string
  dateAdded?: number
}

export type ImportedBookmarkNode =
  | ImportedBookmarkFolder
  | ImportedBookmarkLink

function directElement(parent: Element, tagName: string) {
  return Array.from(parent.children).find(
    (child) => child.tagName.toLowerCase() === tagName,
  )
}

function attribute(element: Element, name: string) {
  const expected = name.toLowerCase()
  return Array.from(element.attributes).find(
    (item) => item.name.toLowerCase() === expected,
  )?.value
}

function logicalEntries(list: Element) {
  return Array.from(list.querySelectorAll('dt')).filter(
    (entry) => entry.closest('dl') === list,
  )
}

function parseList(list: Element): ImportedBookmarkNode[] {
  return logicalEntries(list).flatMap((entry): ImportedBookmarkNode[] => {
    const folderHeading = directElement(entry, 'h3')
    if (folderHeading) {
      const childList = directElement(entry, 'dl')
      return [
        {
          kind: 'folder',
          title: folderHeading.textContent?.trim() || '未命名文件夹',
          children: childList ? parseList(childList) : [],
        },
      ]
    }

    const anchor = directElement(entry, 'a')
    const url = anchor ? attribute(anchor, 'href')?.trim() : undefined
    if (!anchor || !url) return []

    const seconds = Number.parseInt(attribute(anchor, 'add_date') ?? '', 10)
    return [
      {
        kind: 'bookmark',
        title: anchor.textContent?.trim() || url,
        url,
        ...(Number.isFinite(seconds) && seconds >= 0
          ? { dateAdded: seconds * 1_000 }
          : {}),
      },
    ]
  })
}

export function parseBookmarkDocument(document: Document): ImportedBookmarkNode[] {
  const rootList = document.querySelector('dl')
  return rootList ? parseList(rootList) : []
}

export function countImportedNodes(nodes: ImportedBookmarkNode[]): number {
  return nodes.reduce(
    (total, node) =>
      total +
      1 +
      (node.kind === 'folder' ? countImportedNodes(node.children) : 0),
    0,
  )
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

type CatalogEntry =
  | { kind: 'folder'; value: BrowserBookmarkFolder }
  | { kind: 'bookmark'; value: BrowserBookmark }

function childrenForFolder(
  catalog: BrowserBookmarkCatalog,
  folder: BrowserBookmarkFolder,
): CatalogEntry[] {
  const folders = flattenCatalogFolders(catalog.folders)
    .filter((child) => child.parentId === folder.id)
    .map((value): CatalogEntry => ({ kind: 'folder', value }))
  const bookmarks = catalog.bookmarks
    .filter((child) => child.parentId === folder.id)
    .map((value): CatalogEntry => ({ kind: 'bookmark', value }))

  return [...folders, ...bookmarks].sort(
    (left, right) => left.value.index - right.value.index,
  )
}

function serializeEntry(
  entry: CatalogEntry,
  catalog: BrowserBookmarkCatalog,
  depth: number,
): string[] {
  const indent = '    '.repeat(depth)

  if (entry.kind === 'bookmark') {
    const bookmark = entry.value
    const date = bookmark.dateAdded
      ? ` ADD_DATE="${Math.floor(bookmark.dateAdded / 1_000)}"`
      : ''
    return [
      `${indent}<DT><A HREF="${escapeHtml(bookmark.url)}"${date}>${escapeHtml(bookmark.title)}</A></DT>`,
    ]
  }

  const folder = entry.value
  const children = childrenForFolder(catalog, folder).flatMap((child) =>
    serializeEntry(child, catalog, depth + 1),
  )
  return [
    `${indent}<DT><H3>${escapeHtml(folder.title)}</H3>`,
    `${indent}<DL><p>`,
    ...children,
    `${indent}</DL><p>`,
    `${indent}</DT>`,
  ]
}

export function serializeBookmarkHtml(catalog: BrowserBookmarkCatalog): string {
  const roots = [...catalog.folders]
    .sort((left, right) => left.index - right.index)
    .flatMap((folder) =>
      serializeEntry({ kind: 'folder', value: folder }, catalog, 1),
    )

  return [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
    ...roots,
    '</DL><p>',
    '',
  ].join('\n')
}
