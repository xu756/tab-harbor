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

- Browser preview rendered at 1440px and 420px widths.
- `/`, `/tabs`, `/bookmarks`, and `/workspaces` mounted through hash history.
- Legacy `?view=` navigation redirected to the equivalent path.
- The bookmark tree showed every folder expanded on first visit and wrote the
  versioned organizer state.
- Production build and automated tests cover extension routing, bookmark edits,
  move calculations, import rollback, HTML import/export, and organizer state.

## Result

- Removed the monolithic `Dashboard` component.
- Removed the old page-specific CSS control library.
- Added a shared app provider and route shell.
- Added route-level feature components for home, tabs, bookmarks, and workspaces.
- Replaced custom menus, overlays, form controls, selections, empty states,
  loading states, buttons, badges, avatars, cards, and tooltips with shadcn.
- Kept the hidden native file input required by the browser upload picker.

0 wrappers remain on Radix
