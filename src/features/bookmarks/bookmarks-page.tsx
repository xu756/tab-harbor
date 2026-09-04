import { useQueryClient } from '@tanstack/react-query'

import { BookmarkOrganizer } from '@/components/bookmark-organizer'
import { useApp, bookmarksQueryKey } from '@/features/app/app-provider'
import { PageHeading } from '@/features/shared/page-heading'
import { importBookmarkNodes, moveBookmark, openBookmarksManager, openUrlInNewTab, updateBookmark } from '@/lib/chrome'

export function BookmarksPage() {
  const queryClient = useQueryClient()
  const { bookmarkCatalog, loadingBookmarks } = useApp()
  return (
    <section className="space-y-7 px-5 py-8 sm:px-7 sm:py-10">
      <PageHeading
        eyebrow="Chrome bookmarks"
        title="书签"
        description={`像资源管理器一样整理 Chrome 书签，共 ${bookmarkCatalog.bookmarks.length} 项。点击名称会在新标签页打开。`}
      />
      <BookmarkOrganizer
        catalog={bookmarkCatalog}
        loading={loadingBookmarks}
        onOpen={(bookmark) => openUrlInNewTab(bookmark.url)}
        onUpdate={async (id, patch) => { await updateBookmark(id, patch); await queryClient.invalidateQueries({ queryKey: bookmarksQueryKey }) }}
        onMove={async (id, destination) => { await moveBookmark(id, destination); await queryClient.invalidateQueries({ queryKey: bookmarksQueryKey }) }}
        onImport={async (nodes, onProgress) => { const rootId = await importBookmarkNodes(nodes, onProgress); await queryClient.invalidateQueries({ queryKey: bookmarksQueryKey }); return rootId }}
        onOpenManager={openBookmarksManager}
      />
    </section>
  )
}
