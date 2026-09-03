# Bookmark Tree Explorer Design

## Status

Approved direction: classic single-column explorer inspired by VS Code.

## Goal

Replace the flat, folder-grouped bookmarks view with a compact hierarchical tree that makes deeply nested Chrome bookmarks easier to scan and navigate. The result must preserve Harbor's quiet visual language and remain usable in both the new-tab page and the side panel.

## Scope

- Render folders and bookmarks as a single tree with arbitrary nesting.
- Expand only top-level folders on first use.
- Remember manual folder expansion across reloads.
- Reveal complete matching branches while searching.
- Preserve current- and new-tab opening actions.
- Support keyboard navigation and accessible tree semantics.
- Keep virtualization for large bookmark collections.

The feature does not edit, move, create, or delete Chrome bookmarks. It does not request new extension permissions.

## Data Model

Chrome bookmark queries continue to return the existing flat `BrowserBookmark[]` records. A pure tree builder splits each record's `folderPath` on ` / ` and produces folder nodes keyed by their complete path. Bookmark records become leaf nodes under the final folder.

The tree builder returns stable sibling order based on the incoming Chrome bookmark order. Folder nodes precede bookmark leaves within the same parent. Each folder stores its descendant bookmark count for display.

The visible-row builder receives the tree, expanded folder IDs, and normalized search text. Without a search, it emits only descendants of expanded folders. During a search, it emits matching bookmark leaves and every ancestor required to understand their location, regardless of manual expansion state. A matching folder emits its complete subtree so a folder-name search exposes the bookmarks it contains.

## Expansion State

Manual expansion is stored in `localStorage` under `harbor.bookmarks.expanded`. On first use, every top-level folder ID is expanded and nested folders remain collapsed. On subsequent visits, the saved IDs are restored and IDs that no longer exist are ignored.

Search expansion is derived state and is never persisted. Clearing the search restores exactly the manual expansion state that existed before searching.

## Interface

The existing page heading and Chrome Bookmark Manager action remain unchanged. The surface contains:

1. The existing search field.
2. A compact metadata row showing folder and bookmark counts.
3. A virtualized ARIA tree.

Folder and bookmark rows are approximately 34 pixels tall. Each row uses 16 pixels of indentation per depth level.

- Folder row: disclosure chevron, folder icon, title, descendant count.
- Bookmark row: alignment spacer, favicon, title, and a quiet new-tab action.

The URL is available through the row title tooltip rather than a permanent second line. Folder rows toggle on full-row click. Bookmark titles open in the current tab, matching current behavior. The external-link action opens a new tab and remains visible on keyboard focus instead of depending on hover alone.

Colors, borders, typography, and focus rings reuse Harbor's existing design tokens. The tree uses separators and subtle hover/focus surfaces rather than cards inside the main surface.

## Keyboard and Accessibility

The container uses `role="tree"`; visible rows use `role="treeitem"`, `aria-level`, and `aria-expanded` for folders. Roving `tabIndex` keeps one visible row in the tab order.

- Arrow Down / Arrow Up: move focus to the next or previous visible row.
- Arrow Right: expand a collapsed folder; on an expanded folder, move to its first child.
- Arrow Left: collapse an expanded folder; otherwise move to its parent.
- Enter: toggle a folder or open a bookmark.
- Home / End: move to the first or last visible row.

When filtering changes the visible rows, focus moves to the first visible row if the previously focused node disappeared.

## Components and Boundaries

- `src/lib/bookmark-tree.ts`: pure tree construction, filtering, expansion, and visible-row helpers.
- `src/components/dashboard.tsx`: tree state, search state, virtualization, rendering, and keyboard event wiring.
- `src/styles/app.css`: compact explorer rows, indentation, disclosure states, and focus treatment.

The pure tree helpers contain no React, Chrome, or browser-storage dependencies so their behavior can be tested directly.

## Error and Empty States

Existing query loading and empty states remain. A search with no matches shows the existing no-results state. Invalid persisted expansion JSON falls back to the first-use top-level expansion without interrupting rendering.

## Testing

Unit tests cover:

- arbitrary folder nesting and stable output order;
- top-level-only initial expansion;
- collapsed and expanded visible rows;
- search matches with required ancestors;
- matching folder names and descendant visibility;
- invalid persisted expansion fallback where persistence helpers are introduced.

Project validation remains:

```bash
bun run test
bun run typecheck
bun run build
```

Manual extension verification covers mouse expansion, persisted state after reload, search restoration, keyboard navigation, current-tab opening, new-tab opening, and narrow side-panel layout.
