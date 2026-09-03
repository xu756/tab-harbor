# Bookmark Organizer Design

## Status

Approved. This design supersedes the single-column bookmark Explorer direction.

## Goal

Turn the bookmarks page into a two-pane organizer inspired by desktop file explorers. Users can browse the complete Chrome folder tree, open bookmarks in new tabs, edit bookmark details, reorder or move bookmarks by drag and drop, and import or export browser-compatible Bookmark HTML.

## Scope

- Show all Chrome bookmark folders, including empty folders, in a left tree pane.
- Show the selected folder's direct bookmark children in the right pane.
- Open bookmark rows in a new tab by default.
- Edit bookmark titles and URLs inline.
- Reorder bookmarks inside a folder and move them across folders by drag and drop.
- Provide a keyboard-accessible “Move to folder” alternative.
- Import and export Netscape Bookmark HTML.
- Preserve search, virtualization, live Chrome updates, and browser-preview fallbacks.

Creating, renaming, moving, or deleting folders is outside this iteration. Existing managed or otherwise unmodifiable bookmark nodes remain read-only.

## Data Model

`queryBookmarks` returns a `BrowserBookmarkCatalog` instead of a flat bookmark array.

```ts
interface BrowserBookmarkFolder {
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

interface BrowserBookmark {
  id: string
  title: string
  url: string
  parentId: string
  index: number
  folderPath: string
  dateAdded?: number
  unmodifiable: boolean
}

interface BrowserBookmarkCatalog {
  folders: BrowserBookmarkFolder[]
  bookmarks: BrowserBookmark[]
}
```

The Chrome tree is normalized once per query. Folder IDs, bookmark IDs, parent IDs, and indices remain Chrome runtime data and are never reused as Harbor cloud entity IDs. Folder paths are display data. Empty folders stay in `folders`, and bookmarks retain their direct parent and index for mutations.

The development fallback keeps an equivalent catalog in memory, initialized from demo data, so editing, moving, importing, and re-querying work during `bun run dev` without Chrome APIs.

## Layout

The existing heading remains. Its actions become a quiet “管理” menu containing Import Bookmark HTML, Export Bookmark HTML, and Open Chrome Bookmark Manager.

The bookmark surface uses two panes:

- Left: a 260-pixel folder tree with disclosure chevrons, folder names, descendant counts, and selected-folder emphasis.
- Right: the selected folder's direct bookmarks, showing favicon, title, URL, drag handle, edit control, and accessible overflow actions.

The left pane remembers folder expansion and the selected folder in `localStorage`. On first use, top-level folders are expanded and the bookmarks-bar folder is selected when its `folderType` is available; otherwise the first modifiable top-level folder is selected.

Below 700 pixels, the panes stack vertically. The folder tree receives a bounded height and the bookmark list fills the remaining surface. Neither pane requires horizontal scrolling.

## Search

The search field remains above both panes. With no query, the standard selected-folder view is shown. With a query, the right pane becomes a global result list matching bookmark title, URL, or folder path. Each result displays its folder path, and the left tree highlights folders containing matches without changing the saved selection or manual expansion state. Clearing search restores the previous folder view.

## Bookmark Opening and Editing

Clicking a bookmark opens it with `chrome.tabs.create`, matching “open in new tab” behavior. The current Harbor page is never replaced.

The edit control turns the row into title and URL fields. Enter saves, Escape cancels, and focus stays in the row after successful save. Titles are trimmed and must not be empty. URLs are trimmed and must not be empty; schemes such as `https:`, `chrome:`, and `javascript:` are preserved rather than normalized. Failed updates retain the draft and show an inline error.

`updateBookmark(id, { title, url })` delegates to `chrome.bookmarks.update` in extension runtime and updates the in-memory catalog in browser preview. Successful mutations invalidate the bookmarks query.

## Drag and Drop

Every modifiable bookmark row has an always-visible drag handle.

- Dropping before or after another bookmark moves it to the indicated final index in that bookmark's parent folder.
- Dropping on a left-pane folder appends the bookmark to that folder.
- Hovering over a collapsed folder for 650 milliseconds expands it so deeper destinations can be reached.
- The source row lowers opacity, the insertion position shows a strong one-pixel line, and a folder destination uses the existing selected-surface treatment.
- Managed or unmodifiable bookmarks and folders cannot be dragged or targeted.

The reorder helper calculates the final Chrome destination index after accounting for removal from the source folder. `moveBookmark(id, { parentId, index })` calls `chrome.bookmarks.move` or its preview equivalent. On failure, the catalog is refetched and the surface displays a non-blocking error.

For keyboard users, the row overflow menu includes “移动到…”, which opens a small folder picker using the same move mutation. This prevents drag and drop from being the only way to move a bookmark.

## Import Bookmark HTML

The user chooses one `.html` file through a hidden file input. The parser uses `DOMParser`, reads folder names from `H3`, bookmark names and URLs from `A`, and reconstructs nested `DL` lists. It reads text and attributes only and never injects imported HTML into the application DOM.

Before importing, Harbor counts valid folders and bookmarks and shows the pending item count. Confirming creates a top-level folder named `导入的书签 · YYYY-MM-DD` with no `parentId`; Chrome therefore places it in Other Bookmarks. Children are created sequentially with `chrome.bookmarks.create` to preserve source order.

Progress is displayed as created items over total items. If creation fails after the import root exists, Harbor removes that newly created root with `chrome.bookmarks.removeTree`; existing bookmarks are untouched. A successful import invalidates the catalog and selects the imported root.

## Export Bookmark HTML

Export serializes all readable folders and bookmarks to Netscape Bookmark HTML, including empty folders, original sibling order, titles, URLs, and available creation timestamps. Text and attribute values are HTML-escaped.

The result is downloaded as `harbor-bookmarks-YYYY-MM-DD.html` using a Blob URL and an anchor with the `download` attribute. The URL is revoked immediately after the click. No `downloads` permission is added.

## Errors and Concurrency

Only one edit, move, import, or export operation runs at a time. Mutation controls are disabled while an operation is pending. Chrome bookmark events remain the source of truth; every completed mutation also invalidates the TanStack Query explicitly.

Editing failures stay attached to the editing row. Move, import, parse, and export failures appear in a compact status strip above the panes. A successful later action clears the previous error. External changes that remove the selected folder fall back to the first available folder.

## Accessibility

The left pane uses ARIA tree semantics and roving focus with Arrow Up, Arrow Down, Arrow Left, Arrow Right, Home, End, and Enter. The right pane uses a list with clearly labeled buttons and visible focus rings. Drag handles have descriptive labels, while the “移动到…” menu provides a non-pointer alternative.

Edit fields are labeled, errors use `aria-live="polite"`, and import progress uses `role="status"`. Critical actions remain visible on keyboard focus and never depend on hover alone.

## Components and Boundaries

- `src/lib/bookmark-catalog.ts`: normalize Chrome nodes and derive folder/bookmark views.
- `src/lib/bookmark-dnd.ts`: calculate reorder and cross-folder destinations.
- `src/lib/bookmark-html.ts`: pure Bookmark HTML parsing and serialization.
- `src/lib/chrome.ts`: Chrome and preview mutation adapters.
- `src/components/bookmark-organizer.tsx`: two-pane UI, editing, drag state, import/export controls, and accessible navigation.
- `src/components/dashboard.tsx`: query ownership and organizer integration.
- `src/styles/app.css`: responsive two-pane organizer styling.

Pure catalog, drag-index, parser, and serializer modules have no React or Chrome dependencies.

## Testing

Unit tests cover:

- normalization with empty, managed, and nested folders;
- direct-folder and global-search views;
- same-folder forward and backward reordering;
- cross-folder append destinations;
- title and URL validation;
- nested Bookmark HTML parsing;
- HTML escaping, empty folders, ordering, and timestamp export;
- rollback behavior when an import creation fails.

Component tests cover two-pane semantics, selected-folder rendering, new-tab opening intent, edit mode, and disabled managed nodes. Existing route regression tests remain.

Project validation is:

```bash
bun run test
bun run typecheck
bun run build
```

Manual verification in `dist/` covers folder selection, editing, same-folder reorder, cross-folder movement, hover expansion, keyboard movement, HTML round-trip import/export, failure messaging, new-tab behavior, and narrow side-panel layout.
