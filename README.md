# Harbor

Harbor is a local-first Chrome browser workspace that brings **live tabs, Chrome bookmarks, quick links, todos, and saved workspaces** into one calm new-tab experience.

The repository keeps the `tab-harbor` name while the V2 product name is shortened to **Harbor**.

## Product surfaces

- **Home** — greeting, web search, live tabs, editable quick links, todos, and recent workspaces.
- **Tabs** — all regular Chrome tabs and native tab groups with search, multi-select, close, duplicate detection, and save actions.
- **Bookmarks** — the full `chrome.bookmarks` tree, grouped by folder and searchable.
- **Workspaces** — durable local tab collections with restore, rename, and delete actions.
- **Side Panel** — the same application in a compact secondary surface.

No backend is connected in this branch. Local features work without an account.

## Stack

Harbor is a Manifest V3 SPA with no SSR or hydration layer:

- React 19 + TypeScript
- Vite
- TanStack Router
- TanStack Query
- TanStack Store
- TanStack Virtual
- TanStack Form
- Lucide Icons
- Bun

## Local data

`chrome.storage.local` stores workspaces, quick links, and todos. Browser development preview falls back to `localStorage` and demo tabs/bookmarks.

Chrome runtime IDs (`tabId`, `windowId`, `groupId`) are never treated as durable entity IDs. Incognito tabs are excluded from the persisted workspace model by default.

## Permissions

```text
tabs
tabGroups
storage
sidePanel
bookmarks
favicon
```

## Development

```bash
bun install
bun run dev
```

## Build the extension

```bash
bun run typecheck
bun run test
bun run build
```

Load `dist/` as an unpacked extension from `chrome://extensions`.

Verify the new-tab override, Manifest V3 CSP, live tabs/groups, bookmarks, local persistence, themes, and side panel before merging.

## Later

Authentication, cloud sync, device sessions, Send to Device, Inbox, and sync conflict handling remain a separate next-stage layer.
