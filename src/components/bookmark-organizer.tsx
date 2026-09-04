import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Bookmark,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  Folder,
  FolderOpen,
  GripVertical,
  MoreHorizontal,
  MoveRight,
  Pencil,
  Search,
  Upload,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { SiteIcon } from '@/features/shared/site-icon'
import {
  bookmarksForFolder,
  flattenCatalogFolders,
  searchCatalog,
} from '@/lib/bookmark-catalog'
import {
  BOOKMARK_ORGANIZER_STATE_KEY,
  resolveBookmarkOrganizerState,
} from '@/lib/bookmark-organizer-state'
import { calculateBookmarkMove, validateBookmarkDraft } from '@/lib/bookmark-dnd'
import { parseBookmarkDocument, serializeBookmarkHtml } from '@/lib/bookmark-html'
import type { ImportedBookmarkNode } from '@/lib/bookmark-html'
import type {
  BrowserBookmark,
  BrowserBookmarkCatalog,
  BrowserBookmarkFolder,
} from '@/lib/types'
import { cn } from '@/lib/utils'

interface BookmarkOrganizerProps {
  catalog: BrowserBookmarkCatalog
  loading: boolean
  onOpen: (bookmark: BrowserBookmark) => void | Promise<void>
  onUpdate: (id: string, patch: { title: string; url: string }) => Promise<void>
  onMove: (id: string, destination: { parentId: string; index: number }) => Promise<void>
  onImport: (nodes: ImportedBookmarkNode[], onProgress: (done: number, total: number) => void) => Promise<string>
  onOpenManager: () => void | Promise<void>
}

interface VisibleFolder {
  folder: BrowserBookmarkFolder
  depth: number
}

function initialFolder(catalog: BrowserBookmarkCatalog) {
  const all = flattenCatalogFolders(catalog.folders)
  return catalog.folders.find((folder) => folder.folderType === 'bookmarks-bar' && !folder.unmodifiable) ??
    all.find((folder) => !folder.unmodifiable) ?? catalog.folders[0]
}

function visibleFolders(folders: BrowserBookmarkFolder[], expanded: ReadonlySet<string>) {
  const rows: VisibleFolder[] = []
  const visit = (folder: BrowserBookmarkFolder, depth: number) => {
    rows.push({ folder, depth })
    if (expanded.has(folder.id)) folder.children.forEach((child) => visit(child, depth + 1))
  }
  folders.forEach((folder) => visit(folder, 0))
  return rows
}

export function BookmarkOrganizer({ catalog, loading, onOpen, onUpdate, onMove, onImport, onOpenManager }: BookmarkOrganizerProps) {
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [storageReady, setStorageReady] = useState(false)
  const [expansionReady, setExpansionReady] = useState(false)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string>()
  const [draft, setDraft] = useState({ title: '', url: '' })
  const [movingId, setMovingId] = useState<string>()
  const [moveFolderId, setMoveFolderId] = useState('')
  const [pendingId, setPendingId] = useState<string>()
  const [draggedId, setDraggedId] = useState<string>()
  const [dropTarget, setDropTarget] = useState<{ id: string; placement: 'before' | 'after' | 'inside' }>()
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const [importProgress, setImportProgress] = useState<{ done: number; total: number }>()
  const listRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const storedState = useRef<unknown>(undefined)
  const folderHoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const allFolders = useMemo(() => flattenCatalogFolders(catalog.folders), [catalog.folders])
  const fallbackFolder = initialFolder(catalog)
  const selectedFolder = allFolders.find((folder) => folder.id === selectedFolderId) ?? fallbackFolder
  const folderRows = useMemo(() => visibleFolders(catalog.folders, expanded), [catalog.folders, expanded])
  const normalizedSearch = search.trim()
  const bookmarks = useMemo(
    () => normalizedSearch ? searchCatalog(catalog, normalizedSearch) : selectedFolder ? bookmarksForFolder(catalog, selectedFolder.id) : [],
    [catalog, normalizedSearch, selectedFolder],
  )
  const movableFolders = allFolders.filter((folder) => !folder.unmodifiable)
  const selectItems = movableFolders.map((folder) => ({ value: folder.id, label: folder.path.join(' / ') }))
  const virtualizer = useVirtualizer({
    count: bookmarks.length,
    getScrollElement: () => listRef.current,
    estimateSize: (index) => bookmarks[index]?.id === editingId || bookmarks[index]?.id === movingId ? 104 : 50,
    overscan: 16,
  })
  const virtualRows = typeof window === 'undefined'
    ? bookmarks.map((bookmark, index) => ({ key: bookmark.id, index, start: index * 50, size: 50 }))
    : virtualizer.getVirtualItems()
  const virtualHeight = typeof window === 'undefined' ? bookmarks.length * 50 : virtualizer.getTotalSize()

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(BOOKMARK_ORGANIZER_STATE_KEY)
      storedState.current = raw ? JSON.parse(raw) : undefined
    } catch {
      storedState.current = undefined
    } finally {
      setStorageReady(true)
    }
  }, [])

  useEffect(() => {
    if (!storageReady || expansionReady || !allFolders.length) return
    const state = resolveBookmarkOrganizerState(catalog, storedState.current)
    setSelectedFolderId(state.selectedFolderId)
    setExpanded(new Set(state.expandedFolderIds))
    setExpansionReady(true)
  }, [allFolders.length, catalog, expansionReady, storageReady])

  useEffect(() => {
    if (!expansionReady || !allFolders.length) return
    if (!allFolders.some((folder) => folder.id === selectedFolderId)) setSelectedFolderId(fallbackFolder?.id ?? '')
  }, [allFolders, expansionReady, fallbackFolder?.id, selectedFolderId])

  useEffect(() => {
    if (!storageReady || !expansionReady || !selectedFolderId) return
    window.localStorage.setItem(BOOKMARK_ORGANIZER_STATE_KEY, JSON.stringify({
      selectedFolderId,
      expandedFolderIds: [...expanded],
    }))
  }, [expanded, expansionReady, selectedFolderId, storageReady])

  useEffect(() => () => {
    if (folderHoverTimer.current) clearTimeout(folderHoverTimer.current)
  }, [])

  const toggleFolder = (id: string) => setExpanded((current) => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const beginEdit = (bookmark: BrowserBookmark) => {
    setError(undefined)
    setMovingId(undefined)
    setEditingId(bookmark.id)
    setDraft({ title: bookmark.title, url: bookmark.url })
  }

  const saveEdit = async (bookmark: BrowserBookmark) => {
    const validation = validateBookmarkDraft(draft)
    if (!validation.ok) { setError(validation.error); return }
    setPendingId(bookmark.id)
    setError(undefined)
    try {
      await onUpdate(bookmark.id, validation.value)
      setEditingId(undefined)
      setMessage('书签已更新')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法更新书签')
    } finally {
      setPendingId(undefined)
    }
  }

  const handleEditKey = (event: KeyboardEvent<HTMLInputElement>, bookmark: BrowserBookmark) => {
    if (event.key === 'Enter') { event.preventDefault(); void saveEdit(bookmark) }
    if (event.key === 'Escape') { event.preventDefault(); setEditingId(undefined); setError(undefined) }
  }

  const runMove = async (bookmark: BrowserBookmark, target: BrowserBookmark | BrowserBookmarkFolder, placement: 'before' | 'after' | 'inside') => {
    setPendingId(bookmark.id)
    setError(undefined)
    try {
      await onMove(bookmark.id, calculateBookmarkMove(bookmark, target, placement, catalog))
      setMovingId(undefined)
      setMessage(`“${bookmark.title}”已移动`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法移动书签')
    } finally {
      setPendingId(undefined)
      setDraggedId(undefined)
      setDropTarget(undefined)
    }
  }

  const draggedBookmark = catalog.bookmarks.find((bookmark) => bookmark.id === draggedId)
  const handleBookmarkDragOver = (event: DragEvent<HTMLDivElement>, bookmark: BrowserBookmark) => {
    if (!draggedBookmark || bookmark.id === draggedBookmark.id || bookmark.unmodifiable) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const bounds = event.currentTarget.getBoundingClientRect()
    setDropTarget({ id: bookmark.id, placement: event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after' })
  }
  const handleFolderDragOver = (event: DragEvent<HTMLDivElement>, folder: BrowserBookmarkFolder) => {
    if (!draggedBookmark || folder.unmodifiable) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropTarget({ id: folder.id, placement: 'inside' })
    if (!expanded.has(folder.id) && folder.children.length) {
      if (folderHoverTimer.current) clearTimeout(folderHoverTimer.current)
      folderHoverTimer.current = setTimeout(() => setExpanded((current) => new Set([...current, folder.id])), 650)
    }
  }
  const startMovePicker = (bookmark: BrowserBookmark) => {
    const first = movableFolders.find((folder) => folder.id !== bookmark.parentId) ?? movableFolders[0]
    setEditingId(undefined)
    setMovingId(bookmark.id)
    setMoveFolderId(first?.id ?? '')
  }
  const submitMovePicker = async (bookmark: BrowserBookmark) => {
    const target = movableFolders.find((folder) => folder.id === moveFolderId)
    if (!target) { setError('请选择目标文件夹'); return }
    await runMove(bookmark, target, 'inside')
  }

  const exportHtml = () => {
    const url = URL.createObjectURL(new Blob([serializeBookmarkHtml(catalog)], { type: 'text/html;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `tab-harbor-bookmarks-${new Date().toISOString().slice(0, 10)}.html`
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('书签 HTML 已导出')
  }
  const importHtml = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    setError(undefined)
    setMessage(undefined)
    try {
      const document = new DOMParser().parseFromString(await file.text(), 'text/html')
      const nodes = parseBookmarkDocument(document)
      if (!nodes.length) throw new Error('这个 HTML 中没有可导入的书签')
      await onImport(nodes, (done, total) => setImportProgress({ done, total }))
      setMessage('书签导入完成')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法导入书签')
    } finally {
      setImportProgress(undefined)
    }
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center gap-2 border-b p-3">
        <InputGroup className="max-w-xl">
          <InputGroupAddon><Search /></InputGroupAddon>
          <InputGroupInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索名称、网址或文件夹" />
          {search ? <InputGroupAddon align="inline-end"><InputGroupButton size="icon-xs" onClick={() => setSearch('')} aria-label="清除搜索"><X /></InputGroupButton></InputGroupAddon> : null}
        </InputGroup>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="icon" className="ml-auto" aria-label="管理书签" />}><MoreHorizontal /></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}><Upload />导入 HTML</DropdownMenuItem>
              <DropdownMenuItem onClick={exportHtml}><Download />导出 HTML</DropdownMenuItem>
              <DropdownMenuItem onClick={() => void onOpenManager()}><ExternalLink />Chrome 书签管理器</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="sr-only">导入 HTML · 导出 HTML · Chrome 书签管理器</span>
        <input ref={fileInputRef} className="sr-only" type="file" accept=".html,.htm,text/html" aria-label="选择书签 HTML 文件" onChange={(event) => void importHtml(event)} />
      </div>

      <div className="grid min-h-[620px] grid-cols-[18rem_minmax(0,1fr)] max-lg:grid-cols-1">
        <aside className="border-r bg-muted/20 max-lg:max-h-64 max-lg:border-r-0 max-lg:border-b" aria-label="书签文件夹">
          <div className="flex h-11 items-center justify-between border-b px-3 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase"><span>资源管理器</span><Badge variant="secondary">{allFolders.length}</Badge></div>
          <div className="max-h-[574px] overflow-auto p-1.5 max-lg:max-h-52" role="tree">
            {folderRows.map(({ folder, depth }) => {
              const hasChildren = folder.children.length > 0
              const isExpanded = expanded.has(folder.id)
              const selected = folder.id === selectedFolder?.id
              return (
                <div
                  key={folder.id}
                  role="treeitem"
                  aria-level={depth + 1}
                  aria-expanded={hasChildren ? isExpanded : undefined}
                  aria-selected={selected}
                  className={cn('flex h-9 items-center rounded-md transition-colors', selected && 'bg-accent text-accent-foreground', dropTarget?.id === folder.id && 'ring-2 ring-ring/60')}
                  style={{ paddingLeft: `${depth * 14 + 4}px` }}
                  onDragOver={(event) => handleFolderDragOver(event, folder)}
                  onDrop={(event) => { event.preventDefault(); if (draggedBookmark) void runMove(draggedBookmark, folder, 'inside') }}
                >
                  <Button variant="ghost" size="icon-xs" disabled={!hasChildren} className="shrink-0 hover:bg-transparent" aria-label={isExpanded ? `折叠 ${folder.title}` : `展开 ${folder.title}`} onClick={() => toggleFolder(folder.id)}>
                    {hasChildren ? <ChevronRight className={cn('transition-transform duration-150', isExpanded && 'rotate-90')} /> : null}
                  </Button>
                  <Button variant="ghost" className="h-8 min-w-0 flex-1 justify-start gap-2 px-1.5 hover:bg-transparent" onClick={() => setSelectedFolderId(folder.id)} title={folder.path.join(' / ')}>
                    {isExpanded ? <FolderOpen data-icon="inline-start" /> : <Folder data-icon="inline-start" />}
                    <span className="truncate">{folder.title}</span><span className="ml-auto text-xs font-normal text-muted-foreground">{folder.bookmarkCount}</span>
                  </Button>
                </div>
              )
            })}
          </div>
        </aside>

        <section className="min-w-0" aria-label="书签列表">
          <div className="flex h-11 items-center justify-between border-b px-4">
            <strong className="block truncate text-sm">{normalizedSearch ? `“${normalizedSearch}”` : selectedFolder?.title ?? '书签'}</strong>
            <span className="text-xs text-muted-foreground">{normalizedSearch ? `全部文件夹中找到 ${bookmarks.length} 项` : `${bookmarks.length} 个直接书签`}</span>
          </div>
          <div ref={listRef} className="h-[574px] overflow-auto">
            {loading ? <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground"><Spinner />正在读取 Chrome 书签…</div> : null}
            {!loading && !bookmarks.length ? (
              <Empty className="h-full border-0"><EmptyHeader><EmptyMedia variant="icon"><Bookmark /></EmptyMedia><EmptyTitle>{normalizedSearch ? '没有匹配的书签' : '这个文件夹还是空的'}</EmptyTitle><EmptyDescription>{normalizedSearch ? '试试更短的关键词。' : '可以从其他文件夹拖入书签。'}</EmptyDescription></EmptyHeader></Empty>
            ) : null}
            {bookmarks.length ? (
              <div className="relative" style={{ height: virtualHeight }}>
                {virtualRows.map((virtualRow) => {
                  const bookmark = bookmarks[virtualRow.index]
                  if (!bookmark) return null
                  const isEditing = editingId === bookmark.id
                  const isMoving = movingId === bookmark.id
                  const placement = dropTarget?.id === bookmark.id ? dropTarget.placement : undefined
                  return (
                    <div
                      key={virtualRow.key}
                      ref={typeof window === 'undefined' ? undefined : virtualizer.measureElement}
                      data-index={virtualRow.index}
                      className={cn('absolute top-0 left-0 w-full px-2', placement === 'before' && 'border-t-2 border-primary', placement === 'after' && 'border-b-2 border-primary')}
                      style={{ transform: `translateY(${virtualRow.start}px)` }}
                      onDragOver={(event) => handleBookmarkDragOver(event, bookmark)}
                      onDrop={(event) => { event.preventDefault(); if (draggedBookmark && placement && placement !== 'inside') void runMove(draggedBookmark, bookmark, placement) }}
                    >
                      <div
                        className={cn('flex min-h-12 items-center gap-2 border-b px-2', bookmark.unmodifiable && 'opacity-65')}
                        draggable={!bookmark.unmodifiable && !isEditing && !isMoving}
                        onDragStart={(event) => { setDraggedId(bookmark.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', bookmark.id) }}
                        onDragEnd={() => { setDraggedId(undefined); setDropTarget(undefined) }}
                      >
                        <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden="true" />
                        <SiteIcon title={bookmark.title} url={bookmark.url} />
                        {isEditing ? (
                          <div className="grid min-w-0 flex-1 grid-cols-[minmax(10rem,.7fr)_minmax(14rem,1fr)] gap-2 py-2 max-sm:grid-cols-1">
                            <Input autoFocus value={draft.title} aria-label="书签名称" onChange={(event) => setDraft({ ...draft, title: event.target.value })} onKeyDown={(event) => handleEditKey(event, bookmark)} />
                            <Input value={draft.url} aria-label="书签地址" onChange={(event) => setDraft({ ...draft, url: event.target.value })} onKeyDown={(event) => handleEditKey(event, bookmark)} />
                          </div>
                        ) : (
                          <Button variant="ghost" className="h-11 min-w-0 flex-1 justify-start rounded-none px-1 text-left hover:bg-transparent" onClick={() => void onOpen(bookmark)} title={`在新标签页打开 ${bookmark.title}`}>
                            <strong className="block min-w-0 truncate text-sm font-medium">{bookmark.title}</strong>
                          </Button>
                        )}
                        <div className="flex shrink-0 gap-1">
                          {isEditing ? <><Button size="icon-sm" onClick={() => void saveEdit(bookmark)} disabled={pendingId === bookmark.id} aria-label="保存书签"><Check /></Button><Button variant="ghost" size="icon-sm" onClick={() => setEditingId(undefined)} aria-label="取消编辑"><X /></Button></> : <><Button variant="ghost" size="icon-sm" disabled={bookmark.unmodifiable || pendingId === bookmark.id} onClick={() => beginEdit(bookmark)} aria-label={`编辑书签 ${bookmark.title}`}><Pencil /></Button><Button variant="ghost" size="icon-sm" disabled={bookmark.unmodifiable || pendingId === bookmark.id} onClick={() => startMovePicker(bookmark)} aria-label={`移动到… ${bookmark.title}`}><MoveRight /></Button></>}
                        </div>
                      </div>
                      {isMoving ? (
                        <div className="flex items-center gap-2 border-b bg-muted/35 p-2 pl-10">
                          <span className="text-xs font-medium text-muted-foreground">移动到</span>
                          <Select items={selectItems} value={moveFolderId} onValueChange={(value) => setMoveFolderId(value ?? '')}>
                            <SelectTrigger className="min-w-56"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectGroup>{selectItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
                          </Select>
                          <Button size="sm" disabled={!moveFolderId || pendingId === bookmark.id} onClick={() => void submitMovePicker(bookmark)}>移动</Button>
                          <Button variant="ghost" size="sm" onClick={() => setMovingId(undefined)}>取消</Button>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {(importProgress || message || error) ? <><Separator /><div className="flex min-h-10 items-center gap-2 px-4 py-2 text-sm" role={error ? 'alert' : 'status'}>{importProgress ? <><Spinner />正在导入 {importProgress.done} / {importProgress.total}</> : error ? <Badge variant="destructive">错误</Badge> : <Badge variant="secondary">完成</Badge>}<span className={error ? 'text-destructive' : 'text-muted-foreground'}>{error ?? message}</span></div></> : null}
    </Card>
  )
}
