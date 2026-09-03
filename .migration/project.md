# Tab Harbor UI migration

## Baseline

- Date: 2026-09-03
- Package manager: Bun
- Application: React 19, Vite, TanStack Start SPA, Manifest V3
- shadcn CLI: 4.20.1
- shadcn style: `base-nova`
- Primitive layer: Base UI
- Existing Radix wrappers: none
- Baseline validation before initialization: tests, typecheck, and build passed

## Scope

The current hand-written presentation layer is being replaced with local shadcn
components generated for Base UI. The application is also being split into real
TanStack Router routes while preserving Chrome-extension and browser-preview
behavior.

## Repository note

The worktree contains user-managed, untracked skill configuration in `.agents/`,
`.claude/`, and `skills-lock.json`. These files are outside the migration scope
and are intentionally left unchanged and uncommitted.

## Component audit

- Generated components were read in full after installation.
- Interactive primitives import from `@base-ui/react`.
- `buttonVariants` is used for links instead of rendering anchors through the
  Base UI button primitive.
- Menus and selects will keep items inside their required groups.
- Dialog consumers will provide accessible titles and descriptions.
- No `@radix-ui` imports or Radix compatibility wrappers were found.

## Behavior and visual intent

- No product behavior is intentionally removed.
- The quiet reading-desk palette is mapped to shadcn semantic tokens.
- Global text sizing is increased for readability while tab rows stay compact.
- Motion is limited to short state and overlay transitions and respects reduced
  motion preferences.

## Manual verification

- Run the browser preview and exercise all four routes.
- Load `dist/client` as an unpacked extension.
- Verify the new-tab override and side panel.
- Verify bookmark editing, default-new-tab opening, drag moves, ordering, import,
  export, and persisted tree expansion.

0 wrappers remain on Radix
