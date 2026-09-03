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
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  ChangeEvent,
  CSSProperties,
  DragEvent,
  KeyboardEvent,
} from 'react'
import {
  bookmarksForFolder,
  flattenCatalogFolders,
  searchCatalog,
} from '../lib/bookmark-catalog'
import {
  calculateBookmarkMove,
  validateBookmarkDraft,
} from '../lib/bookmark-dnd'
import {
  parseBookmarkDocument,
  serializeBookmarkHtml,
} from '../lib/bookmark-html'
import type { ImportedBookmarkNode } from '../lib/bookmark-html'
import { faviconUrlForPage, hostnameFromUrl } from '../lib/chrome'
import type {
  BrowserBookmark,
  BrowserBookmarkCatalog,
  BrowserBookmarkFolder,
} from '../lib/types'

const EXPANDED_KEY = 'harbor.bookmarks.organizer.expanded'
const SELECTED_KEY = 'harbor.bookmarks.organizer.selected'

interface BookmarkOrganizerProps {
  catalog: BrowserBookmarkCatalog
  loading: boolean
  onOpen: (bookmark: BrowserBookmark) => void | Promise<void>
  onUpdate: (
    id: string,
    patch: { title: string; url: string },
  ) => Promise<void>
  onMove: (
    id: string,
    destination: { parentId: string; index: number },
  ) => Promise<void>
  onImport: (
    nodes: ImportedBookmarkNode[],
    onProgress: (done: number, total: number) => void,
  ) => Promise<string>
  onOpenManager: () => void | Promise<void>
}

interface VisibleFolder {
  folder: BrowserBookmarkFolder
  depth: number
}

function initialFolder(catalog: BrowserBookmarkCatalog) {
  return (
    catalog.folders.find(
      (folder) => folder.folderType === 'bookmarks-bar' && !folder.unmodifiable,
    ) ??
    flattenCatalogFolders(catalog.folders).find(
      (folder) => !folder.unmodifiable,
    ) ??
    catalog.folders[0]
  )
}

function visibleFolders(
  folders: BrowserBookmarkFolder[],
  expanded: ReadonlySet<string>,
) {
  const rows: VisibleFolder[] = []
  const visit = (folder: BrowserBookmarkFolder, depth: number) => {
    rows.push({ folder, depth })
    if (expanded.has(folder.id)) {
      folder.children.forEach((child) => visit(child, depth + 1))
    }
  }
  folders.forEach((folder) => visit(folder, 0))
  return rows
}

function SiteMark({ bookmark }: { bookmark: BrowserBookmark }) {
  const [failed, setFailed] = useState(false)
  const src = faviconUrlForPage(bookmark.url, 32)
  return (
    <span className="organizer-site-mark" aria-hidden="true">
      {src && !failed ? (
        <img src={src} alt="" onError={() => setFailed(true)} />
      ) : (
        bookmark.title.slice(0, 1).toUpperCase()
      )}
    </span>
  )
}

export function BookmarkOrganizer({
  catalog,
  loading,
  onOpen,
  onUpdate,
  onMove,
  onImport,
  onOpenManager,
}: BookmarkOrganizerProps) {
  const fallbackFolder = initialFolder(catalog)
  const [selectedFolderId, setSelectedFolderId] = useState(
    fallbackFolder?.id ?? '',
  )
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(catalog.folders.map((folder) => folder.id)),
  )
  const [storageReady, setStorageReady] = useState(false)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string>()
  const [draft, setDraft] = useState({ title: '', url: '' })
  const [movingId, setMovingId] = useState<string>()
  const [moveFolderId, setMoveFolderId] = useState('')
  const [pendingId, setPendingId] = useState<string>()
  const [draggedId, setDraggedId] = useState<string>()
  const [dropTarget, setDropTarget] = useState<{
    id: string
    placement: 'before' | 'after' | 'inside'
  }>()
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const [importProgress, setImportProgress] = useState<{
    done: number
    total: number
  }>()
  const listRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderHoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )

  const allFolders = useMemo(
    () => flattenCatalogFolders(catalog.folders),
    [catalog.folders],
  )
  const selectedFolder =
    allFolders.find((folder) => folder.id === selectedFolderId) ?? fallbackFolder
  const folderRows = useMemo(
    () => visibleFolders(catalog.folders, expanded),
    [catalog.folders, expanded],
  )
  const normalizedSearch = search.trim()
  const bookmarks = useMemo(
    () =>
      normalizedSearch
        ? searchCatalog(catalog, normalizedSearch)
        : selectedFolder
          ? bookmarksForFolder(catalog, selectedFolder.id)
          : [],
    [catalog, normalizedSearch, selectedFolder],
  )
  const movableFolders = allFolders.filter((folder) => !folder.unmodifiable)
  const virtualizer = useVirtualizer({
    count: bookmarks.length,
    getScrollElement: () => listRef.current,
    estimateSize: (index) =>
      bookmarks[index]?.id === editingId || bookmarks[index]?.id === movingId
        ? 102
        : 48,
    overscan: 16,
  })
  const virtualRows =
    typeof window === 'undefined'
      ? bookmarks.map((bookmark, index) => ({
          key: bookmark.id,
          index,
          start: index * 48,
          size: 48,
        }))
      : virtualizer.getVirtualItems()
  const virtualHeight =
    typeof window === 'undefined'
      ? bookmarks.length * 48
      : virtualizer.getTotalSize()

  useEffect(() => {
    try {
      const storedSelected = window.localStorage.getItem(SELECTED_KEY)
      const storedExpanded = JSON.parse(
        window.localStorage.getItem(EXPANDED_KEY) ?? 'null',
      ) as unknown
      if (storedSelected && allFolders.some((folder) => folder.id === storedSelected)) {
        setSelectedFolderId(storedSelected)
      }
      if (
        Array.isArray(storedExpanded) &&
        storedExpanded.every((id) => typeof id === 'string')
      ) {
        setExpanded(
          new Set(
            storedExpanded.filter((id) =>
              allFolders.some((folder) => folder.id === id),
            ),
          ),
        )
      }
    } finally {
      setStorageReady(true)
    }
  }, [])

  useEffect(() => {
    if (selectedFolderId && allFolders.some((folder) => folder.id === selectedFolderId)) {
      return
    }
    setSelectedFolderId(fallbackFolder?.id ?? '')
  }, [allFolders, fallbackFolder?.id, selectedFolderId])

  useEffect(() => {
    if (!storageReady) return
    window.localStorage.setItem(SELECTED_KEY, selectedFolderId)
    window.localStorage.setItem(EXPANDED_KEY, JSON.stringify([...expanded]))
  }, [expanded, selectedFolderId, storageReady])

  useEffect(
    () => () => {
      if (folderHoverTimer.current) clearTimeout(folderHoverTimer.current)
    },
    [],
  )

  const toggleFolder = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const beginEdit = (bookmark: BrowserBookmark) => {
    setError(undefined)
    setMovingId(undefined)
    setEditingId(bookmark.id)
    setDraft({ title: bookmark.title, url: bookmark.url })
  }

  const saveEdit = async (bookmark: BrowserBookmark) => {
    const validation = validateBookmarkDraft(draft)
    if (!validation.ok) {
      setError(validation.error)
      return
    }

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

  const handleEditKey = (
    event: KeyboardEvent<HTMLInputElement>,
    bookmark: BrowserBookmark,
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void saveEdit(bookmark)
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setEditingId(undefined)
      setError(undefined)
    }
  }

  const runMove = async (
    bookmark: BrowserBookmark,
    target: BrowserBookmark | BrowserBookmarkFolder,
    placement: 'before' | 'after' | 'inside',
  ) => {
    setPendingId(bookmark.id)
    setError(undefined)
    try {
      await onMove(
        bookmark.id,
        calculateBookmarkMove(bookmark, target, placement, catalog),
      )
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

  const draggedBookmark = catalog.bookmarks.find(
    (bookmark) => bookmark.id === draggedId,
  )

  const handleBookmarkDragOver = (
    event: DragEvent<HTMLDivElement>,
    bookmark: BrowserBookmark,
  ) => {
    if (!draggedBookmark || bookmark.id === draggedBookmark.id || bookmark.unmodifiable) {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const bounds = event.currentTarget.getBoundingClientRect()
    const placement = event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after'
    setDropTarget({ id: bookmark.id, placement })
  }

  const handleFolderDragOver = (
    event: DragEvent<HTMLDivElement>,
    folder: BrowserBookmarkFolder,
  ) => {
    if (!draggedBookmark || folder.unmodifiable) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropTarget({ id: folder.id, placement: 'inside' })
    if (!expanded.has(folder.id) && folder.children.length > 0) {
      if (folderHoverTimer.current) clearTimeout(folderHoverTimer.current)
      folderHoverTimer.current = setTimeout(() => {
        setExpanded((current) => new Set([...current, folder.id]))
      }, 650)
    }
  }

  const startMovePicker = (bookmark: BrowserBookmark) => {
    const firstDestination =
      movableFolders.find((folder) => folder.id !== bookmark.parentId) ??
      movableFolders[0]
    setEditingId(undefined)
    setMovingId(bookmark.id)
    setMoveFolderId(firstDestination?.id ?? '')
  }

  const submitMovePicker = async (bookmark: BrowserBookmark) => {
    const target = movableFolders.find((folder) => folder.id === moveFolderId)
    if (!target) {
      setError('请选择目标文件夹')
      return
    }
    await runMove(bookmark, target, 'inside')
  }

  const exportHtml = () => {
    const html = serializeBookmarkHtml(catalog)
    const url = URL.createObjectURL(
      new Blob([html], { type: 'text/html;charset=utf-8' }),
    )
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
      if (nodes.length === 0) throw new Error('这个 HTML 中没有可导入的书签')
      await onImport(nodes, (done, total) => setImportProgress({ done, total }))
      setMessage('书签导入完成')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法导入书签')
    } finally {
      setImportProgress(undefined)
    }
  }

  return (
    <div className="bookmark-organizer surface">
      <div className="bookmark-organizer-toolbar">
        <label className="search-field bookmark-organizer-search">
          <Search size={15} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索名称、网址或文件夹"
          />
          {search ? (
            <button type="button" onClick={() => setSearch('')} aria-label="清除搜索">
              <X size={14} />
            </button>
          ) : null}
        </label>
        <details className="item-menu organizer-management-menu">
          <summary aria-label="管理书签" title="管理书签">
            <MoreHorizontal size={16} />
          </summary>
          <div className="menu-popover">
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              <Upload size={13} />导入 HTML
            </button>
            <button type="button" onClick={exportHtml}>
              <Download size={13} />导出 HTML
            </button>
            <button type="button" onClick={() => void onOpenManager()}>
              <ExternalLink size={13} />Chrome 书签管理器
            </button>
          </div>
        </details>
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept=".html,.htm,text/html"
          aria-label="选择书签 HTML 文件"
          onChange={(event) => void importHtml(event)}
        />
      </div>

      <div className="bookmark-organizer-body">
        <aside className="bookmark-folder-pane" aria-label="书签文件夹">
          <div className="organizer-pane-heading">
            <span>资源管理器</span>
            <small>{allFolders.length}</small>
          </div>
          <div className="organizer-folder-tree" role="tree">
            {folderRows.map(({ folder, depth }) => {
              const hasChildren = folder.children.length > 0
              const isExpanded = expanded.has(folder.id)
              const selected = folder.id === selectedFolder?.id
              const style = { '--folder-depth': depth } as CSSProperties
              return (
                <div
                  key={folder.id}
                  className={`organizer-folder-row${selected ? ' selected' : ''}${dropTarget?.id === folder.id ? ' drop-inside' : ''}`}
                  role="treeitem"
                  aria-level={depth + 1}
                  aria-expanded={hasChildren ? isExpanded : undefined}
                  aria-selected={selected}
                  style={style}
                  onDragOver={(event) => handleFolderDragOver(event, folder)}
                  onDrop={(event) => {
                    event.preventDefault()
                    if (draggedBookmark) void runMove(draggedBookmark, folder, 'inside')
                  }}
                >
                  <button
                    className="folder-disclosure"
                    type="button"
                    disabled={!hasChildren}
                    aria-label={isExpanded ? `折叠 ${folder.title}` : `展开 ${folder.title}`}
                    onClick={() => toggleFolder(folder.id)}
                  >
                    {hasChildren ? (
                      <ChevronRight size={13} className={isExpanded ? 'expanded' : ''} />
                    ) : null}
                  </button>
                  <button
                    className="folder-select"
                    type="button"
                    onClick={() => setSelectedFolderId(folder.id)}
                    title={folder.path.join(' / ')}
                  >
                    {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
                    <span>{folder.title}</span>
                    <small>{folder.bookmarkCount}</small>
                  </button>
                </div>
              )
            })}
          </div>
        </aside>

        <section className="bookmark-content-pane" aria-label="书签列表">
          <div className="organizer-content-heading">
            <div>
              <strong>{normalizedSearch ? `“${normalizedSearch}”` : selectedFolder?.title ?? '书签'}</strong>
              <span>
                {normalizedSearch
                  ? `全部文件夹中找到 ${bookmarks.length} 项`
                  : `${bookmarks.length} 个直接书签`}
              </span>
            </div>
            {selectedFolder?.unmodifiable ? <small>由浏览器策略管理</small> : null}
          </div>

          <div className="organizer-bookmark-list" ref={listRef}>
            {loading ? <div className="organizer-empty">正在读取 Chrome 书签…</div> : null}
            {!loading && bookmarks.length === 0 ? (
              <div className="organizer-empty">
                <Bookmark size={18} />
                <strong>{normalizedSearch ? '没有匹配的书签' : '这个文件夹还是空的'}</strong>
                <span>{normalizedSearch ? '试试更短的关键词。' : '可以从其他文件夹拖入书签。'}</span>
              </div>
            ) : null}
            {bookmarks.length > 0 ? (
              <div className="organizer-virtual-canvas" style={{ height: virtualHeight }}>
                {virtualRows.map((virtualRow) => {
                  const bookmark = bookmarks[virtualRow.index]
                  if (!bookmark) return null
                  const isEditing = editingId === bookmark.id
                  const isMoving = movingId === bookmark.id
                  const placement =
                    dropTarget?.id === bookmark.id ? dropTarget.placement : undefined
                  return (
                    <div
                      key={virtualRow.key}
                      ref={typeof window === 'undefined' ? undefined : virtualizer.measureElement}
                      data-index={virtualRow.index}
                      className={`organizer-bookmark-position${placement ? ` drop-${placement}` : ''}`}
                      style={{ transform: `translateY(${virtualRow.start}px)` }}
                      onDragOver={(event) => handleBookmarkDragOver(event, bookmark)}
                      onDrop={(event) => {
                        event.preventDefault()
                        if (draggedBookmark && placement && placement !== 'inside') {
                          void runMove(draggedBookmark, bookmark, placement)
                        }
                      }}
                    >
                      <div
                        className={`organizer-bookmark-row${bookmark.unmodifiable ? ' managed' : ''}`}
                        draggable={!bookmark.unmodifiable && !isEditing && !isMoving}
                        onDragStart={(event) => {
                          setDraggedId(bookmark.id)
                          event.dataTransfer.effectAllowed = 'move'
                          event.dataTransfer.setData('text/plain', bookmark.id)
                        }}
                        onDragEnd={() => {
                          setDraggedId(undefined)
                          setDropTarget(undefined)
                        }}
                      >
                        <GripVertical className="bookmark-drag-handle" size={14} aria-hidden="true" />
                        <SiteMark bookmark={bookmark} />
                        {isEditing ? (
                          <div className="bookmark-edit-fields">
                            <input
                              autoFocus
                              value={draft.title}
                              aria-label="书签名称"
                              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                              onKeyDown={(event) => handleEditKey(event, bookmark)}
                            />
                            <input
                              value={draft.url}
                              aria-label="书签地址"
                              onChange={(event) => setDraft({ ...draft, url: event.target.value })}
                              onKeyDown={(event) => handleEditKey(event, bookmark)}
                            />
                          </div>
                        ) : (
                          <button
                            className="organizer-bookmark-main"
                            type="button"
                            onClick={() => void onOpen(bookmark)}
                            title={`在新标签页打开 ${bookmark.title}`}
                          >
                            <strong>{bookmark.title}</strong>
                            <span>{bookmark.url}</span>
                            {normalizedSearch ? <small>{bookmark.folderPath}</small> : null}
                          </button>
                        )}

                        {isEditing ? (
                          <div className="organizer-row-actions">
                            <button
                              type="button"
                              aria-label="保存书签"
                              title="保存"
                              disabled={pendingId === bookmark.id}
                              onClick={() => void saveEdit(bookmark)}
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              aria-label="取消编辑"
                              title="取消"
                              onClick={() => setEditingId(undefined)}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="organizer-row-actions">
                            <button
                              type="button"
                              aria-label={`编辑书签 ${bookmark.title}`}
                              title="编辑书签"
                              disabled={bookmark.unmodifiable || pendingId === bookmark.id}
                              onClick={() => beginEdit(bookmark)}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              aria-label={`移动到… ${bookmark.title}`}
                              title="移动到…"
                              disabled={bookmark.unmodifiable || pendingId === bookmark.id}
                              onClick={() => startMovePicker(bookmark)}
                            >
                              <MoveRight size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      {isMoving ? (
                        <div className="bookmark-move-picker">
                          <label>
                            <span>移动到</span>
                            <select
                              value={moveFolderId}
                              onChange={(event) => setMoveFolderId(event.target.value)}
                            >
                              {movableFolders.map((folder) => (
                                <option key={folder.id} value={folder.id}>
                                  {folder.path.join(' / ')}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            className="compact-primary"
                            type="button"
                            disabled={!moveFolderId || pendingId === bookmark.id}
                            onClick={() => void submitMovePicker(bookmark)}
                          >
                            移动
                          </button>
                          <button type="button" onClick={() => setMovingId(undefined)}>
                            取消
                          </button>
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

      {importProgress ? (
        <div className="bookmark-organizer-status" role="status">
          正在导入 {importProgress.done} / {importProgress.total}
        </div>
      ) : message ? (
        <div className="bookmark-organizer-status" role="status">{message}</div>
      ) : null}
      {error ? (
        <div className="bookmark-organizer-status error" role="alert">{error}</div>
      ) : null}
    </div>
  )
}
