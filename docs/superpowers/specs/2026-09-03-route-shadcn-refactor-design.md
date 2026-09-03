# Route-first shadcn UI Refactor Design

## Goal

Replace the query-string view switch and hand-built UI primitives with a route-first, componentized application using shadcn components backed by Base UI. Increase typography across the extension, preserve the quiet reading-desk identity, and make the bookmark explorer fully expanded on its first run.

## Scope

This is a full frontend structure and component-system refactor. It covers the shared application shell, all four primary pages, dialogs, menus, forms, list controls, responsive behavior, and route navigation. Existing local data models and Chrome adapters remain unchanged unless a small interface adjustment is required by the new component boundary.

The refactor must preserve:

- live-tab management and workspace persistence;
- quick links and todos;
- bookmark editing, new-tab opening, drag reordering, cross-folder movement, HTML import/export, and Chrome manager access;
- Manifest V3 CSP safety and the browser-preview fallback;
- the existing light/dark/system theme behavior;
- new-tab and side-panel entry points.

## Routing Architecture

TanStack Router becomes the source of truth for primary navigation:

- `#/` — home;
- `#/tabs` — live tabs;
- `#/bookmarks` — bookmark organizer;
- `#/workspaces` — saved workspaces.

A pathless `_app` layout route renders `AppLayout` and an `Outlet`. The layout owns the shared header, navigation, theme control, command palette, and providers needed across pages. Each route renders one page component and owns or consumes only the queries and mutations it needs.

Navigation uses typed TanStack `Link` components with active states. Programmatic navigation is limited to flows that genuinely need it. The index route recognizes legacy `?view=` values and redirects to the corresponding path so existing saved extension URLs continue to work. The `surface=sidepanel` search value remains valid at every route and controls narrow-surface behavior without selecting the page.

## Component Boundaries

The current monolithic `Dashboard` is replaced by focused modules:

- `AppLayout` — shared application chrome and global overlays;
- `HomePage` — welcome, recent tabs, quick links, and todos;
- `TabsPage` — searchable and virtualized live-tab list;
- `BookmarksPage` — page heading, bookmark query ownership, and organizer mutations;
- `WorkspacesPage` — workspace grid, rename, restore, and removal flows;
- feature components for quick links, todos, workspaces, selection state, and command search;
- `BookmarkOrganizer` remains a focused feature component with no router responsibility;
- `components/ui/*` contains generated or skill-approved shadcn/Base UI primitives only.

Shared Chrome and local persistence queries use stable TanStack Query keys exported from a small query module. Components invalidate only the affected key after mutations.

## shadcn and Base UI Strategy

The project-local `shadcn` skill defines initialization, registry usage, generated file locations, and supported commands. The `migrate-radix-to-base` skill defines the Base UI-compatible imports and APIs. Both skill documents are authoritative during implementation.

The intended primitive set is deliberately small:

- Button, Input, Card, Badge, Separator, Skeleton;
- Dropdown Menu, Dialog, Alert Dialog, Tooltip;
- Scroll Area, Select, Checkbox;
- Collapsible for folder disclosure where it improves accessibility;
- Command for global search if the installed shadcn registry supports the Base UI variant cleanly.

No parallel hand-built button, input, menu, dialog, select, or tooltip system remains. Feature-specific layout classes are allowed, but primitive interaction styling must come from shadcn variants and theme tokens rather than repeated ad hoc CSS.

## Visual System and Typography

The direction remains a refined, quiet browser workspace: warm neutral surfaces, thin separators, restrained shadows, strong favicon identity, and compact information density. The refactor must not become a generic SaaS dashboard or card wall.

Typography increases globally:

- base body and interactive text: 14px;
- compact metadata: 12px minimum;
- primary row labels: 14px;
- secondary URLs and descriptions: 12–13px;
- navigation and action labels: 13–14px;
- page titles retain their current visual hierarchy.

Line heights and row heights increase proportionally so larger text does not clip. Live-tab and bookmark rows remain compact at approximately 42–46px. Text truncation is retained for long titles and URLs.

Theme values live in semantic CSS variables consumed by Tailwind/shadcn utilities. Existing warm light and charcoal dark palettes are translated into those tokens rather than replaced with default shadcn gray or blue themes.

## Motion

Motion is functional and restrained:

- route content fades and rises slightly on entry;
- dropdowns, dialogs, tooltips, and collapsibles use their shadcn/Base UI state animations;
- bookmark drop targets and selected rows transition through color and inset-border changes;
- pending mutations use subtle spinner or skeleton feedback;
- no continuous decorative motion is introduced.

All motion respects `prefers-reduced-motion`.

## Bookmark Expansion Behavior

On the first visit after this refactor, every readable bookmark folder ID is placed in the expanded set, including nested folders. A versioned persistence key prevents the old partial-expansion value from overriding this new default.

After initialization, expansion and selected-folder state are persisted. Subsequent visits restore the user's own collapsed and selected state. If folders are added or removed, invalid IDs are discarded; newly added folders do not unexpectedly reopen folders the user collapsed.

## Error and Loading Behavior

Each page provides a stable loading skeleton or compact empty state. Mutation errors remain near the feature that caused them. Bookmark import progress remains visible and failed imports retain the existing rollback behavior. Dialog forms keep user input when a mutation fails.

The route shell provides a compact not-found state with navigation back to home. A page-level failure must not remove the shared header or make other routes unreachable.

## Testing and Validation

Tests cover:

- typed route paths and legacy `?view=` redirects;
- shared layout navigation and active states;
- all four route components rendering independently;
- bookmark first-run full expansion and persisted-state restoration;
- globally raised typography tokens and absence of the old undersized bookmark rules;
- existing bookmark catalog, drag, import/export, and mutation behavior.

Final validation runs `bun run test`, `bun run typecheck`, `bun run build`, and `git diff --check`. The built extension is inspected at desktop, side-panel, and 420px widths, and its manifest permissions and new-tab/side-panel paths are rechecked.

## Migration Sequence

1. Initialize the skill-approved shadcn/Base UI foundation and semantic theme tokens.
2. Add the pathless application layout and real page routes, including legacy redirects.
3. Extract each page and its feature components from `Dashboard` without changing behavior.
4. Replace hand-built primitives route by route with shadcn components.
5. increase global typography and add motion/reduced-motion handling.
6. Version the bookmark expansion persistence and default it to all folder IDs.
7. Remove the obsolete `Dashboard` view switch and dead custom primitive styles after replacement coverage is green.

## Non-goals

- No backend, authentication, or cloud sync work.
- No changes to the durable workspace or bookmark data model.
- No new Chrome permissions.
- No visual redesign into a dashboard/card-wall aesthetic.
- No runtime-loaded fonts, scripts, or CDN assets.
