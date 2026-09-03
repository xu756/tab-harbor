# Bookmark Tree Explorer Implementation Plan

> Superseded by `2026-09-03-bookmark-organizer.md` after the approved switch to a two-pane organizer.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the grouped bookmark list with a compact, persistent, keyboard-accessible tree explorer.

**Architecture:** Build the hierarchy and visible rows in a pure `bookmark-tree` module, keeping Chrome and React out of the core logic. `BookmarksView` owns search, expansion, focus, and virtualization, while CSS supplies the dense Explorer presentation.

**Tech Stack:** React 19, TypeScript, TanStack Virtual, Bun test, Chrome Manifest V3

---

## File Structure

- Create `src/lib/bookmark-tree.ts`: tree construction, expansion persistence parsing, filtering, flattening, and keyboard action calculation.
- Create `tests/bookmark-tree.test.ts`: unit coverage for hierarchy, expansion, search, persistence, and keyboard behavior.
- Modify `src/components/dashboard.tsx`: replace grouped rows with tree state and ARIA tree rendering.
- Modify `src/styles/app.css`: add compact Explorer row, indentation, focus, and disclosure styles.
- Modify `.gitignore`: ignore persisted visual-companion artifacts under `.superpowers/`.

### Task 1: Build the bookmark hierarchy

**Files:**
- Create: `src/lib/bookmark-tree.ts`
- Create: `tests/bookmark-tree.test.ts`

- [ ] **Step 1: Write the failing hierarchy test**

```ts
import { expect, test } from 'bun:test'
import { buildBookmarkTree } from '../src/lib/bookmark-tree'

test('builds folders at every path level and counts descendant bookmarks', () => {
  const tree = buildBookmarkTree([
    { id: '1', title: 'Router', url: 'https://tanstack.com', folderPath: '书签栏 / 开发' },
    { id: '2', title: 'Design', url: 'https://example.com', folderPath: '书签栏 / 设计' },
  ])

  expect(tree[0]?.name).toBe('书签栏')
  expect(tree[0]?.bookmarkCount).toBe(2)
  expect(tree[0]?.folders.map((folder) => folder.name)).toEqual(['开发', '设计'])
})
```

- [ ] **Step 2: Run the hierarchy test and verify RED**

Run: `bun test tests/bookmark-tree.test.ts`

Expected: FAIL because `src/lib/bookmark-tree.ts` does not exist.

- [ ] **Step 3: Implement the minimal tree builder**

Define `BookmarkFolderNode` with `kind`, `id`, `name`, `path`, `depth`, `folders`, `bookmarks`, and `bookmarkCount`. Split `folderPath` on ` / `, reuse folders through a map keyed by the complete path, append bookmark leaves in source order, and calculate descendant counts recursively.

```ts
export function buildBookmarkTree(bookmarks: BrowserBookmark[]): BookmarkFolderNode[] {
  const roots: BookmarkFolderNode[] = []
  const foldersById = new Map<string, BookmarkFolderNode>()

  for (const bookmark of bookmarks) {
    const segments = bookmark.folderPath.split(' / ').map((part) => part.trim()).filter(Boolean)
    let siblings = roots
    let parent: BookmarkFolderNode | undefined
    const path: string[] = []

    for (const name of segments.length ? segments : ['书签']) {
      path.push(name)
      const id = `folder:${path.join('\u001f')}`
      let folder = foldersById.get(id)
      if (!folder) {
        folder = { kind: 'folder', id, name, path: [...path], depth: path.length - 1, folders: [], bookmarks: [], bookmarkCount: 0 }
        foldersById.set(id, folder)
        siblings.push(folder)
      }
      parent = folder
      siblings = folder.folders
    }

    parent?.bookmarks.push({ kind: 'bookmark', id: `bookmark:${bookmark.id}`, bookmark })
  }

  const count = (folder: BookmarkFolderNode): number =>
    folder.bookmarks.length + folder.folders.reduce((total, child) => total + count(child), 0)
  for (const folder of foldersById.values()) folder.bookmarkCount = count(folder)
  return roots
}
```

- [ ] **Step 4: Run the hierarchy test and verify GREEN**

Run: `bun test tests/bookmark-tree.test.ts`

Expected: 1 test passes.

- [ ] **Step 5: Commit the hierarchy**

```bash
git add src/lib/bookmark-tree.ts tests/bookmark-tree.test.ts
git commit -m "feat: build bookmark folder tree"
```

### Task 2: Flatten expansion and search state

**Files:**
- Modify: `src/lib/bookmark-tree.ts`
- Modify: `tests/bookmark-tree.test.ts`

- [ ] **Step 1: Write failing expansion and search tests**

Add tests that assert:

```ts
const expanded = getInitialExpandedFolderIds(tree)
expect([...expanded]).toEqual([tree[0]!.id])
expect(flattenBookmarkTree(tree, expanded, '').map((row) => row.label)).toEqual([
  '书签栏', '开发', '设计',
])
expect(flattenBookmarkTree(tree, expanded, 'router').map((row) => row.label)).toEqual([
  '书签栏', '开发', 'Router',
])
expect(flattenBookmarkTree(tree, new Set(), '开发').map((row) => row.label)).toEqual([
  '书签栏', '开发', 'Router',
])
```

- [ ] **Step 2: Run the new tests and verify RED**

Run: `bun test tests/bookmark-tree.test.ts`

Expected: FAIL because the expansion and flattening exports are missing.

- [ ] **Step 3: Implement visible rows**

Add `BookmarkTreeRow`, `getInitialExpandedFolderIds`, and `flattenBookmarkTree`. Normal mode emits folders and only expanded descendants. Search mode recursively includes matching bookmarks plus ancestors; a folder-name match includes that folder's complete subtree. Every row carries `id`, `kind`, `label`, `depth`, `parentId`, and folder rows carry `expanded` and `hasChildren`.

```ts
export function getInitialExpandedFolderIds(tree: BookmarkFolderNode[]) {
  return new Set(tree.map((folder) => folder.id))
}

export function flattenBookmarkTree(
  tree: BookmarkFolderNode[],
  expanded: ReadonlySet<string>,
  search: string,
): BookmarkTreeRow[] {
  const query = search.trim().toLowerCase()
  return query
    ? flattenSearchResults(tree, query)
    : flattenExpandedFolders(tree, expanded)
}
```

- [ ] **Step 4: Run the tests and verify GREEN**

Run: `bun test tests/bookmark-tree.test.ts`

Expected: all hierarchy, expansion, and search tests pass.

- [ ] **Step 5: Commit visible-row behavior**

```bash
git add src/lib/bookmark-tree.ts tests/bookmark-tree.test.ts
git commit -m "feat: flatten bookmark tree rows"
```

### Task 3: Persist expansion and calculate keyboard actions

**Files:**
- Modify: `src/lib/bookmark-tree.ts`
- Modify: `tests/bookmark-tree.test.ts`

- [ ] **Step 1: Write failing persistence and keyboard tests**

```ts
expect(parseExpandedFolderIds('["folder:a"]', new Set(['fallback']))).toEqual(new Set(['folder:a']))
expect(parseExpandedFolderIds('invalid', new Set(['fallback']))).toEqual(new Set(['fallback']))

const action = getBookmarkTreeKeyAction(rows, 'folder:root', 'ArrowRight')
expect(action).toEqual({ type: 'expand', id: 'folder:root' })
expect(getBookmarkTreeKeyAction(rows, 'bookmark:1', 'ArrowUp')).toEqual({ type: 'focus', id: 'folder:root' })
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `bun test tests/bookmark-tree.test.ts`

Expected: FAIL because persistence parsing and keyboard action exports are missing.

- [ ] **Step 3: Implement persistence parsing and keyboard actions**

```ts
export function parseExpandedFolderIds(raw: string | null, fallback: ReadonlySet<string>) {
  if (!raw) return new Set(fallback)
  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) && value.every((id) => typeof id === 'string')
      ? new Set(value)
      : new Set(fallback)
  } catch {
    return new Set(fallback)
  }
}
```

Implement `getBookmarkTreeKeyAction` for Arrow Up, Arrow Down, Arrow Left, Arrow Right, Home, End, and Enter. Return declarative actions (`focus`, `expand`, `collapse`, `activate`, or `none`) so React event wiring remains small and testable.

- [ ] **Step 4: Run the tests and verify GREEN**

Run: `bun test tests/bookmark-tree.test.ts`

Expected: all bookmark-tree tests pass.

- [ ] **Step 5: Commit persistence and keyboard behavior**

```bash
git add src/lib/bookmark-tree.ts tests/bookmark-tree.test.ts
git commit -m "feat: add bookmark tree interactions"
```

### Task 4: Render the virtualized ARIA tree

**Files:**
- Modify: `src/components/dashboard.tsx`

- [ ] **Step 1: Add imports and tree state**

Replace `BookmarkVirtualRow` and folder grouping with imports from `bookmark-tree`. In `BookmarksView`, memoize the tree and rows, initialize expanded IDs from `localStorage`, persist toggles, keep `focusedId`, and retain the existing search state.

```tsx
const tree = useMemo(() => buildBookmarkTree(bookmarks), [bookmarks])
const initialExpanded = useMemo(() => getInitialExpandedFolderIds(tree), [tree])
const [expanded, setExpanded] = useState<Set<string>>(() =>
  parseExpandedFolderIds(window.localStorage.getItem(BOOKMARK_EXPANSION_KEY), initialExpanded),
)
const rows = useMemo(
  () => flattenBookmarkTree(tree, expanded, search),
  [tree, expanded, search],
)
```

Synchronize first-use expansion after asynchronous bookmarks arrive without overwriting a saved empty set. Persist changes only after tree initialization.

- [ ] **Step 2: Replace grouped rendering with tree rows**

Render the virtual canvas with `role="tree"` and one `role="treeitem"` per visible row. Add `aria-level`, `aria-expanded`, `data-depth`, and roving `tabIndex`. Folder rows toggle on click; bookmark rows open in the current tab and retain the external-link button.

```tsx
<div className="bookmark-tree" role="tree" aria-label="Chrome 书签">
  <div className="virtual-canvas" style={{ height: virtualizer.getTotalSize() }}>
    {virtualizer.getVirtualItems().map((virtualRow) => {
      const row = rows[virtualRow.index]
      return row ? <BookmarkTreeItem key={row.id} row={row} /> : null
    })}
  </div>
</div>
```

- [ ] **Step 3: Wire keyboard behavior**

On each row, call `getBookmarkTreeKeyAction(rows, row.id, event.key)`, prevent default for handled keys, and apply the returned focus, expansion, collapse, or activation action. Focus the matching DOM row by `data-tree-id` after state changes and move focus to the first row when filtering removes the focused item.

- [ ] **Step 4: Run type checking**

Run: `bun run typecheck`

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 5: Commit the Explorer rendering**

```bash
git add src/components/dashboard.tsx
git commit -m "feat: render bookmark tree explorer"
```

### Task 5: Style the Explorer and finish validation

**Files:**
- Modify: `src/styles/app.css`
- Modify: `.gitignore`

- [ ] **Step 1: Add compact tree styling**

Replace `.bookmark-folder` and the two-line `.bookmark-row` rules with 34px Explorer rows. Use `padding-inline-start: calc(10px + var(--tree-depth) * 16px)`, 14px disclosure/icon slots, truncated titles, descendant counts, existing warm surface tokens, and visible `:focus-visible` outlines. Keep the external action quiet but available on focus and at narrow widths.

- [ ] **Step 2: Ignore visual-companion state**

Add `.superpowers/` to `.gitignore` so design-session runtime files are never committed.

- [ ] **Step 3: Run complete automated validation**

Run:

```bash
bun run test
bun run typecheck
bun run build
git diff --check
```

Expected: all tests pass, type checking exits 0, Vite produces `dist/`, and the diff has no whitespace errors.

- [ ] **Step 4: Inspect the production artifact**

Confirm `dist/index.html`, `dist/manifest.json`, and built assets exist. Load `dist/` as an unpacked extension and verify mouse expansion, saved state after reload, search restoration, arrow-key navigation, current-tab opening, new-tab opening, and side-panel width.

- [ ] **Step 5: Commit Explorer styling**

```bash
git add src/styles/app.css .gitignore
git commit -m "style: finish bookmark tree explorer"
```
