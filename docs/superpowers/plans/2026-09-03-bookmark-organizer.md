# Bookmark Organizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-column bookmark tree with a two-pane Chrome bookmark organizer supporting new-tab opening, editing, drag movement, and Bookmark HTML import/export.

**Architecture:** Normalize the complete Chrome bookmark tree into a catalog that preserves empty folders, IDs, parent IDs, and indices. Keep catalog transforms, drag destinations, and HTML conversion pure; route all mutations through Chrome adapters with an in-memory preview fallback. Render the organizer in a focused component and leave `Dashboard` responsible for Query ownership.

**Tech Stack:** React 19, TypeScript, TanStack Query, TanStack Virtual, Chrome Bookmarks API, Bun test, native HTML drag-and-drop

---

## File Structure

- Modify `src/lib/types.ts`: catalog, folder, and mutation types.
- Create `src/lib/bookmark-catalog.ts`: normalize trees and derive folder/search views.
- Create `src/lib/bookmark-dnd.ts`: validate edits and calculate move indices.
- Create `src/lib/bookmark-html.ts`: parse and serialize Netscape Bookmark HTML.
- Modify `src/lib/chrome.ts`: query catalog plus update, move, create, remove-tree, and preview adapters.
- Create `src/components/bookmark-organizer.tsx`: two-pane organizer and all bookmark interactions.
- Modify `src/components/dashboard.tsx`: replace the single-tree view with organizer integration.
- Modify `src/styles/app.css`: two-pane, editing, drag, menu, status, and narrow-layout styles.
- Delete `src/lib/bookmark-tree.ts` and its superseded tests after organizer coverage is green.

### Task 1: Normalize the complete bookmark catalog

**Files:** `src/lib/types.ts`, `src/lib/bookmark-catalog.ts`, `tests/bookmark-catalog.test.ts`

- [ ] Write a failing test using a nested input with an empty folder and a bookmark. Assert folder IDs, paths, descendant counts, direct bookmarks, indices, and managed state survive normalization.
- [ ] Run `bun test tests/bookmark-catalog.test.ts`; expect failure because `normalizeBookmarkCatalog` is missing.
- [ ] Define `BrowserBookmarkFolder`, expanded `BrowserBookmark`, and `BrowserBookmarkCatalog` in `types.ts`. Implement:

```ts
export function normalizeBookmarkCatalog(nodes: BookmarkNodeInput[]): BrowserBookmarkCatalog
export function flattenCatalogFolders(folders: BrowserBookmarkFolder[]): BrowserBookmarkFolder[]
export function bookmarksForFolder(catalog: BrowserBookmarkCatalog, folderId: string): BrowserBookmark[]
export function searchCatalog(catalog: BrowserBookmarkCatalog, query: string): BrowserBookmark[]
```

Walk children in source order, propagate managed state from ancestors, preserve empty folders, and sort direct results by `index`.
- [ ] Run the focused test and then `bun run typecheck`; expect both to pass.
- [ ] Commit with `git commit -m "feat: normalize bookmark catalog"`.

### Task 2: Calculate edit and drag destinations

**Files:** `src/lib/bookmark-dnd.ts`, `tests/bookmark-dnd.test.ts`

- [ ] Write failing tests for trimmed edit drafts, empty-title/URL errors, same-folder moves forward and backward, and cross-folder append.
- [ ] Run `bun test tests/bookmark-dnd.test.ts`; expect missing-export failures.
- [ ] Implement:

```ts
export function validateBookmarkDraft(draft: { title: string; url: string }):
  | { ok: true; value: { title: string; url: string } }
  | { ok: false; error: string }

export function calculateBookmarkMove(
  source: BrowserBookmark,
  target: BrowserBookmark | BrowserBookmarkFolder,
  placement: 'before' | 'after' | 'inside',
  catalog: BrowserBookmarkCatalog,
): { parentId: string; index: number }
```

For before/after, remove the source from the logical destination list before finding the final insertion index. For inside, append to the target folder's direct children.
- [ ] Run the tests; expect all destination and validation cases to pass.
- [ ] Commit with `git commit -m "feat: calculate bookmark drag moves"`.

### Task 3: Parse and serialize Bookmark HTML

**Files:** `package.json`, `bun.lock`, `src/lib/bookmark-html.ts`, `tests/bookmark-html.test.ts`

- [ ] Add `linkedom` as a dev dependency for DOMParser-based unit tests with `bun add -d linkedom`.
- [ ] Write failing tests for nested folders, empty folders, sibling order, title/URL escaping, and ADD_DATE timestamps.
- [ ] Run `bun test tests/bookmark-html.test.ts`; expect missing parser/serializer exports.
- [ ] Define `ImportedBookmarkFolder | ImportedBookmarkLink` and implement:

```ts
export function parseBookmarkDocument(document: Document): ImportedBookmarkNode[]
export function serializeBookmarkHtml(catalog: BrowserBookmarkCatalog): string
export function countImportedNodes(nodes: ImportedBookmarkNode[]): number
```

Parse `DT > H3` and its following `DL` as folders, parse `DT > A` as links, consume only `textContent` and `href`, and never inject imported markup. Serialize ordered `H3`, `A`, and nested `DL` nodes with complete HTML escaping.
- [ ] Run HTML tests and typecheck; expect green.
- [ ] Commit with `git commit -m "feat: import and export bookmark html"`.

### Task 4: Add Chrome and preview mutations

**Files:** `src/lib/chrome.ts`, `src/lib/demo-data.ts`, `tests/bookmark-mutations.test.ts`

- [ ] Write failing adapter-independent tests for sequential import creation, progress values, and rollback of only the newly created import root after a child failure.
- [ ] Implement a preview bookmark tree initialized from demo data and adapters:

```ts
export async function queryBookmarks(): Promise<BrowserBookmarkCatalog>
export async function updateBookmark(id: string, patch: { title: string; url: string }): Promise<void>
export async function moveBookmark(id: string, destination: { parentId: string; index: number }): Promise<void>
export async function importBookmarkNodes(nodes: ImportedBookmarkNode[], onProgress: (done: number, total: number) => void): Promise<string>
```

Extension runtime delegates to `chrome.bookmarks.getTree`, `update`, `move`, `create`, and `removeTree`. Preview runtime mutates the in-memory tree and re-normalizes it on query. Import creates `导入的书签 · YYYY-MM-DD` without `parentId`, creates descendants sequentially, and removes that root on failure.
- [ ] Run mutation tests and all existing tests; expect green.
- [ ] Commit with `git commit -m "feat: add bookmark mutation adapters"`.

### Task 5: Build the two-pane organizer

**Files:** `src/components/bookmark-organizer.tsx`, `src/components/dashboard.tsx`, `tests/bookmark-organizer.test.tsx`

- [ ] Write a failing server-render test asserting `aria-label="书签文件夹"`, `aria-label="书签列表"`, selected-folder text, direct bookmark title/URL, and edit/move/import/export controls.
- [ ] Implement `BookmarkOrganizer` with props for the catalog and async mutation callbacks. Persist selected/expanded folder IDs; choose bookmarks-bar or first modifiable root initially; fall back when selection disappears.
- [ ] Render a 260px folder tree and virtualized direct-bookmark list. Search switches only the right pane to global results and shows each result's folder path.
- [ ] Make bookmark title clicks call the new-tab callback. Add inline title/URL editing with Enter, Escape, validation, pending state, and retained drafts on failure.
- [ ] Add native drag events. Show before/after insertion zones in the right pane, accept inside drops in the left tree, and auto-expand a collapsed drag target after 650ms. Disable managed sources/targets.
- [ ] Add an accessible “移动到…” folder picker using the same move callback.
- [ ] Add a management menu and hidden `.html` file input. Parse files with `DOMParser`, show pending/import progress, invoke import, and download serialized HTML through a temporary Blob URL.
- [ ] Replace the old `BookmarksView` in `dashboard.tsx`, pass `catalog.bookmarks` to the command palette, and invalidate `BOOKMARKS_QUERY_KEY` after mutations.
- [ ] Run `bun test tests/bookmark-organizer.test.tsx` and `bun run typecheck`; expect green.
- [ ] Commit with `git commit -m "feat: add two-pane bookmark organizer"`.

### Task 6: Replace single-tree styling and dead code

**Files:** `src/styles/app.css`, `src/lib/bookmark-tree.ts`, `tests/bookmark-tree.test.ts`, `tests/bookmark-tree-view.test.tsx`

- [ ] Replace single-tree CSS with `.bookmark-organizer`, `.bookmark-folder-pane`, `.bookmark-content-pane`, `.organizer-folder-row`, `.organizer-bookmark-row`, `.bookmark-drop-line`, `.bookmark-edit-fields`, and management/status styles.
- [ ] Add a `@media (max-width: 700px)` stacked layout with a bounded folder-pane height and no horizontal overflow.
- [ ] Delete the superseded `bookmark-tree.ts` module and its two test files after organizer tests are green; remove its imports and exported row component from `dashboard.tsx`.
- [ ] Run `bun run test`, `bun run typecheck`, `bun run build`, and `git diff --check`; expect all commands to exit 0.
- [ ] Capture 1440×1000 and 420×900 bookmark screenshots and inspect both for truncation, overflow, drag affordance visibility, and hierarchy clarity.
- [ ] Commit with `git commit -m "style: finish bookmark organizer"`.

### Task 7: Final extension verification

**Files:** no production changes expected

- [ ] Verify `dist/index.html`, `dist/manifest.json`, and built asset files exist.
- [ ] Verify the manifest still requests only `tabs`, `tabGroups`, `storage`, `sidePanel`, `bookmarks`, and `favicon`.
- [ ] Run the complete test suite once more and record the passing count.
- [ ] Inspect `git status`, commit only organizer-related remaining files, and preserve unrelated router/documentation changes already present in the worktree.
