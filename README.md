# Tab Harbor

Tab Harbor is a calm, local-first Chrome workspace for managing live tabs and turning temporary browsing state into reusable workspaces.

The v2 rewrite is built with the TanStack ecosystem instead of the previous plain HTML/CSS/script architecture.

## Product model

- **Live Tabs** are the tabs that currently exist in Chrome.
- **Workspaces** are durable local collections of URLs that can be restored later.
- **Devices** is currently a product shell only; authentication and cloud synchronization are intentionally not connected yet.
- The new-tab page is the primary workspace. The Chrome side panel is a secondary quick-access surface.

## Stack

- TanStack Start in SPA mode
- TanStack Router
- TanStack Query
- TanStack Store
- TanStack Virtual
- TanStack Form
- React 19 + TypeScript
- Vite + Bun
- Chrome Manifest V3

## Current v2 features

- Read all normal Chrome tabs and native tab groups
- Domain fallback grouping for ungrouped tabs
- Compact high-density tab list
- Search by title or URL
- Activate and close tabs
- Multi-select tabs and batch close/save
- Duplicate URL detection
- Save all, a group, or selected tabs as a local workspace
- Restore a workspace into a new Chrome window
- Delete local workspaces
- `Ctrl/Cmd + K` command palette
- Light / dark / system themes
- Side-panel entry from the extension action
- Browser-preview demo data when running outside Chrome extension runtime
- Static Devices/Login UI reserved for the future backend phase

## Local data

Workspaces are stored with `chrome.storage.local`. Development preview falls back to `localStorage`.

Tab IDs, window IDs, and Chrome group IDs are runtime-only identifiers and are not used as durable workspace IDs. Incognito tabs are excluded from the local workspace model by default.

## Development

```bash
bun install
bun run dev
```

The development server uses demo tab data when Chrome extension APIs are unavailable.

## Build the extension

```bash
bun install
bun run typecheck
bun run build
```

Load the generated `dist/client` directory from `chrome://extensions` using **Load unpacked**.

Verify at minimum:

1. Opening a new tab renders Tab Harbor.
2. The toolbar action opens the side panel.
3. Real tabs and native tab groups are visible.
4. Saving and restoring a workspace works after browser reload.
5. No inline-script CSP errors are reported by Chrome.

## Backend status

There is no backend integration in this branch. Login, device sessions, cloud sync, Send to Device, inbox, and conflict resolution are intentionally left for the next phase.

## Repository

The active rewrite branch is `refactor/tanstack-start` until the v2 implementation is validated and merged.
