# Tab Harbor Agent Guide

Tab Harbor is a calm, local-first browser workspace. The product is a Chrome new-tab workspace first, with the side panel as a secondary surface.

## Product direction

1. Treat live browser tabs as runtime state and workspaces as durable user state.
2. Local mode must remain useful without an account or backend.
3. Multi-device sync, authentication, inbox, and remote sessions are separate layers and must not leak into the local data model.
4. Preserve the quiet reading-desk visual identity: warm neutral surfaces, compact rows, low visual noise, strong scanability.
5. Do not turn the interface into a SaaS dashboard or a card wall.

## Frontend architecture

The current project is a client-only Vite SPA built for Manifest V3. It does not use SSR or hydration.

- Vite: application shell and extension build pipeline.
- TanStack Router: type-safe URL/search state.
- TanStack Query: Chrome API and local persistence queries/mutations.
- TanStack Store: transient UI state.
- TanStack Virtual: large live-tab lists.
- TanStack Form: workspace forms.
- shadcn with Base UI: accessible application components.
- Tailwind CSS 4: semantic tokens, layout, and responsive styling.
- React 19 + TypeScript + Vite.

Source lives in `src/`; extension static assets live in `public/`. `bun run build` produces the unpacked extension in `dist/`.

Extension pages use hash history so the physical `index.html` path is not interpreted as an application route.

Current application routes are `/`, `/tabs`, `/bookmarks`, and `/workspaces`.

## Chrome constraints

1. Manifest V3 extension pages must remain CSP-safe: no remote scripts and no runtime code fetched from a CDN.
2. `tabId`, `windowId`, and Chrome `groupId` are runtime identifiers only. Never persist them as cloud entity IDs.
3. Incognito data must never be persisted or synced by default.
4. Request the minimum permissions needed for implemented features.
5. Chrome APIs must always have a browser-preview fallback so `bun run dev` remains useful outside extension runtime.
6. Chrome bookmarks are owned by `chrome.bookmarks`; do not duplicate the bookmark tree in Harbor storage.

## UI guardrails

1. Live tab rows should stay compact (roughly 40px).
2. Critical actions cannot depend on hover alone; keyboard focus must be visible.
3. Use one strong action per area and keep secondary controls quiet.
4. Prefer text hierarchy, whitespace, separators, and favicon identity over decorative cards.
5. Keep the main new-tab layout useful at 1280, 1440, 1920, 2K, and 4K widths; side-panel widths must degrade to a single-column layout.

## Documentation

1. Describe the current product and architecture in present tense.
2. Keep `README.md` and `README.zh-CN.md` aligned when product behavior changes.
3. Document Chrome permissions and local data handling when a feature starts reading or writing new browser data.
4. Keep detailed architecture and feature behavior in `docs/`; link those references from the README.

## Validation

Before merging a UI change:

```bash
bun install
bun run test
bun run typecheck
bun run build
```

Then load `dist/` as an unpacked Chrome extension and verify the new-tab override and side panel.
