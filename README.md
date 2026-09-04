# Harbor

[简体中文](./README.zh-CN.md)

Harbor is a calm, local-first Chrome workspace for live tabs, Chrome bookmarks, quick links, todos, and saved workspaces. It replaces the Chrome new-tab page and is also available in the side panel.

The extension works without an account or backend. Browser data stays in Chrome, while Harbor's durable data is stored locally.

## Features

- **Home** — web search, current tabs, editable quick links, todos, and recent workspaces.
- **Tabs** — search regular Chrome tabs and native tab groups, select multiple tabs, close tabs, find duplicates, and save a selection as a workspace.
- **Bookmarks** — browse the real Chrome bookmark tree in a two-pane explorer, search by title, URL, or folder, edit bookmarks, drag to reorder or move, choose a destination folder with the keyboard-accessible move action, and import or export bookmark HTML.
- **Workspaces** — save durable local tab collections, then restore, rename, or delete them.
- **Command menu** — press `Ctrl+K` or `⌘K` to find tabs, bookmarks, workspaces, and common actions.
- **Side panel** — use the same application at a narrow browser width.

Bookmark folders are fully expanded on the first visit. Harbor then remembers the selected folder and expansion state. The bookmark list shows titles only during normal browsing; the URL appears when editing.

## Routes

Harbor uses hash history because every extension surface loads the same physical `index.html` file.

| Route | Page |
| --- | --- |
| `#/` | Home |
| `#/tabs` | Tabs |
| `#/bookmarks` | Bookmarks |
| `#/workspaces` | Workspaces |

## Technology

- React 19 and TypeScript
- Vite and Manifest V3
- TanStack Router, Query, Store, Virtual, and Form
- shadcn components built on Base UI
- Tailwind CSS 4 and Lucide icons
- Bun

This is a client-only SPA. It does not use SSR or hydration, and extension pages do not load runtime code from a CDN.

## Development

Requirements: a current Bun installation and a Chromium-based browser.

```bash
bun install
bun run dev
```

The development server is available at `http://localhost:5173`. When Chrome extension APIs are unavailable, it uses representative demo tabs and bookmarks. Preview bookmark changes remain in memory until the page is reloaded; workspaces, quick links, and todos use the development origin's `localStorage`.

## Build and install

```bash
bun run test
bun run typecheck
bun run build
```

The production extension is written to `dist/`.

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this repository's `dist/` directory.
5. Open a new tab and verify the side panel from the extension action.

After another build, click **Reload** for Harbor on `chrome://extensions` before testing the updated files.

## Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the browser preview |
| `bun run test` | Run the test suite |
| `bun run typecheck` | Check TypeScript types |
| `bun run build` | Build and type-check the extension |
| `bun run preview` | Preview the production build |

## Project layout

```text
src/
  components/       shared shadcn UI and bookmark organizer
  features/         application shell and route-level features
  lib/              Chrome adapters, persistence, and domain helpers
  routes/           TanStack Router route modules
  state/            transient UI state
  styles/           global theme and layout tokens
public/              manifest, service worker, and extension icons
docs/                architecture, bookmark, and design references
```

See [Architecture](./docs/architecture.md), [Chrome bookmarks](./docs/bookmarks.md), [Design principles](./docs/design-principles.md), and [Privacy](./PRIVACY.md) for details.

## Chrome permissions

| Permission | Use |
| --- | --- |
| `tabs` | Read, activate, close, and restore regular tabs |
| `tabGroups` | Read native Chrome tab-group metadata |
| `bookmarks` | Read and perform user-requested bookmark edits, moves, imports, and exports |
| `storage` | Store Harbor workspaces, quick links, and todos locally |
| `sidePanel` | Provide the secondary side-panel surface |
| `favicon` | Display site identity without fetching a separate remote asset |

Incognito tabs are excluded from Harbor's persisted workspace model.
