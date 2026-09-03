# Route-first shadcn UI Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the monolithic query-switched dashboard with four typed routes and a Base UI-backed shadcn component system, while increasing typography globally and defaulting the complete bookmark tree to expanded.

**Architecture:** A pathless TanStack Router layout owns `AppProvider`, `AppLayout`, shared navigation, dialogs, and command search. Route page components consume focused data from the provider, while generated shadcn primitives live under `src/components/ui`; feature-specific structure uses Tailwind layout utilities and semantic theme tokens. Existing Chrome, storage, bookmark catalog, import/export, and mutation modules remain the domain layer.

**Tech Stack:** React 19, TypeScript, Vite, TanStack Router/Query/Virtual/Form, shadcn CLI, Base UI, Tailwind CSS v4, lucide-react, Bun test

---

## File Structure

- Create `components.json`: Base UI `base-nova` shadcn project configuration.
- Modify `package.json`, `vite.config.ts`, `tsconfig.json`, `src/styles/app.css`: shadcn/Tailwind foundation, aliases, semantic warm theme, global 14px typography.
- Create `src/lib/utils.ts`: generated `cn()` utility.
- Create `src/components/ui/*`: CLI-generated Base UI shadcn primitives only.
- Create `src/lib/navigation.ts`: route metadata and legacy `?view=` path conversion.
- Create `src/routes/_app.tsx`, `_app.index.tsx`, `_app.tabs.tsx`, `_app.bookmarks.tsx`, `_app.workspaces.tsx`: shared layout and four real routes.
- Modify `src/routes/index.tsx`: remove query-driven page switching after compatibility redirect is established.
- Create `src/features/app/app-provider.tsx`, `app-layout.tsx`, `app-dialogs.tsx`: shared queries, modal state, header, command palette, selection bar.
- Create `src/features/home/home-page.tsx`, `src/features/tabs/tabs-page.tsx`, `src/features/tabs/live-tabs.tsx`, `src/features/bookmarks/bookmarks-page.tsx`, `src/features/workspaces/workspaces-page.tsx`, `src/features/quick-links/quick-links-panel.tsx`, `src/features/todos/todo-panel.tsx`: extracted feature UI.
- Modify `src/components/bookmark-organizer.tsx`: shadcn composition, Tailwind utilities, versioned fully-expanded initial state.
- Delete `src/components/dashboard.tsx`: obsolete view switch and hand-built primitives.
- Create `.migration/project.md`: Base UI preflight and final dependency/sweep report.
- Create or modify focused tests under `tests/`.

### Task 1: Establish the Base UI shadcn foundation

**Files:** `components.json`, `package.json`, `vite.config.ts`, `tsconfig.json`, `src/lib/utils.ts`, `src/styles/app.css`, `src/components/ui/*`, `tests/shadcn-foundation.test.ts`, `.migration/project.md`

- [ ] Write `tests/shadcn-foundation.test.ts` first. It must read `components.json` and assert `style === 'base-nova'`, `rsc === false`, the `@/components/ui` alias, and that `src/components/ui/button.tsx` imports `@base-ui/react/button` without `radix-ui` or `@radix-ui`.
- [ ] Run `bun test tests/shadcn-foundation.test.ts`; expect failure because `components.json` and generated components do not exist.
- [ ] Preserve the user-installed `.agents/`, `.claude/`, and `skills-lock.json`. Commit the already-verified extension hash-routing changes separately so tracked files are clean enough to attribute the migration baseline. Record the unavoidable untracked skill directories in `.migration/project.md` rather than modifying or staging them.
- [ ] Run the baseline commands and record their result in `.migration/project.md`:

```bash
bun run test
bun run typecheck
bun run build
```

- [ ] Install the cached/current shadcn CLI with Bun if `bunx` resolution remains slow, then run the required project inspection:

```bash
bun add -d shadcn@4.20.1
bunx --bun shadcn@latest info --json
```

If `info` reports no configuration, initialize the existing Vite project with Base Nova:

```bash
bunx --bun shadcn@latest init --preset base-nova
```

Do not create `components.json` by hand. Trust the CLI output for `base`, aliases, Tailwind version, CSS path, and icon library.
- [ ] Before consuming components, run the mandated documentation lookup:

```bash
bunx --bun shadcn@latest docs button input input-group card badge separator skeleton dropdown-menu dialog alert-dialog tooltip scroll-area select checkbox collapsible command empty spinner field avatar
```

Open the returned official documentation URLs and use the Base UI examples.
- [ ] Inspect installed components with `info`, then add only missing components through the CLI:

```bash
bunx --bun shadcn@latest add button input input-group card badge separator skeleton dropdown-menu dialog alert-dialog tooltip scroll-area select checkbox collapsible command empty spinner field avatar
```

- [ ] Read every generated `src/components/ui/*` file. For each overlay/selector wrapper, confirm the Base UI `render` API, required Group composition, semantic tokens, and icon library. Run:

```bash
rg -n "radix-ui|@radix-ui|IconPlaceholder" src/components/ui package.json
```

Expected: no matches. Confirm `@base-ui/react` is installed.
- [ ] Translate the existing warm neutral palette into shadcn semantic variables in the CLI-selected global CSS file. Keep only Tailwind imports, semantic variables, base rules, and reduced-motion handling; do not recreate button/card/dialog primitives in CSS. Set body to 14px and metadata to use Tailwind `text-xs` (12px) or larger.
- [ ] Complete `.migration/project.md` with CLI version, detected Base UI style, dependency additions, pre-existing untracked skill directories, zero source Radix wrappers found, and a manual QA list. End with `0 wrappers remain on Radix`.
- [ ] Run the focused foundation test, typecheck, and build; expect all to pass.
- [ ] Commit with `git commit -m "refactor: establish base shadcn ui foundation"` while excluding the user-installed skill files.

### Task 2: Add typed page routes and shared application layout

**Files:** `src/lib/navigation.ts`, `src/routes/__root.tsx`, `src/routes/_app.tsx`, `src/routes/_app.index.tsx`, `src/routes/_app.tabs.tsx`, `src/routes/_app.bookmarks.tsx`, `src/routes/_app.workspaces.tsx`, `src/routes/index.tsx`, `src/features/app/app-layout.tsx`, `tests/application-routing.test.tsx`, `tests/extension-routing.test.ts`

- [ ] Write failing route tests asserting the generated router exposes `/`, `/tabs`, `/bookmarks`, and `/workspaces`, and that `legacyViewPath('bookmarks')` returns `/bookmarks`. Update extension-routing coverage to expect the side-panel entry at `index.html#/?surface=sidepanel` and direct bookmark URLs under `#/bookmarks`.
- [ ] Run `bun test tests/application-routing.test.tsx tests/extension-routing.test.ts`; expect missing route/path failures.
- [ ] Implement `src/lib/navigation.ts` with one typed source of truth:

```ts
export const appNavigation = [
  { to: '/', label: '首页' },
  { to: '/tabs', label: '标签' },
  { to: '/bookmarks', label: '书签' },
  { to: '/workspaces', label: '工作区' },
] as const

export function legacyViewPath(view: unknown) {
  return appNavigation.find((item) => item.to.slice(1) === view)?.to ?? '/'
}
```

- [ ] Create the pathless `_app` route. It renders `<AppProvider><AppLayout /></AppProvider>` and `AppLayout` renders the typed navigation plus `<Outlet />`. Use TanStack `<Link>` through Base UI shadcn `<Button render={<Link ... />} nativeButton={false}>`; use active props instead of local view state.
- [ ] Create the four route modules. Each route imports exactly one page component. Keep `surface` as a validated optional search parameter on `_app` so it is inherited by child routes.
- [ ] Add a compatibility redirect for legacy `?view=` at the index boundary using `beforeLoad` and `throw redirect({ to: legacyViewPath(search.view), search: { surface: search.surface }, replace: true })`. Avoid redirecting when `view` is absent.
- [ ] Add a route-entry animation wrapper using `animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none`; do not implement JS timers.
- [ ] Regenerate `src/routeTree.gen.ts` through the Vite/TanStack plugin by running `bun run build`; never edit the generated file manually.
- [ ] Run route tests, typecheck, and build; expect four typed route paths and zero NotFound errors.
- [ ] Commit with `git commit -m "refactor: route primary pages with tanstack router"`.

### Task 3: Extract shared data, overlays, and command navigation

**Files:** `src/features/app/app-provider.tsx`, `src/features/app/app-dialogs.tsx`, `src/features/app/command-menu.tsx`, `src/features/app/selection-bar.tsx`, `src/features/app/app-layout.tsx`, `tests/app-provider.test.tsx`

- [ ] Write a failing server-render test that wraps a child in `AppProvider` with injectable snapshot data and asserts the layout exposes navigation, theme control, command trigger, and child outlet content. Test command entries link to route paths rather than invoking a `view` setter.
- [ ] Run `bun test tests/app-provider.test.tsx`; expect missing provider/layout exports.
- [ ] Implement stable query keys and `AppProvider`. Its public context shape is:

```ts
interface AppContextValue {
  tabs: BrowserTab[]
  bookmarkCatalog: BrowserBookmarkCatalog
  workspaces: Workspace[]
  quickLinks: QuickLink[]
  todos: TodoItem[]
  loading: { tabs: boolean; bookmarks: boolean }
  openSaveWorkspace(tabs: BrowserTab[]): void
  openQuickLink(link?: QuickLink): void
  openRenameWorkspace(workspace: Workspace): void
  refresh(key: 'tabs' | 'bookmarks' | 'workspaces' | 'quickLinks' | 'todos'): Promise<void>
}
```

Subscribe to Chrome tab/bookmark events once inside the provider and invalidate the corresponding query key.
- [ ] Migrate save-workspace, quick-link edit, and rename-workspace overlays to generated shadcn `Dialog`, `FieldGroup`, `Field`, `FieldLabel`, `Input`, and `Button`. Every dialog has `DialogTitle` and `DialogDescription`; failed mutations retain form values and show semantic error text.
- [ ] Migrate command search to shadcn `Command` inside `Dialog`. Put every `CommandItem` inside `CommandGroup`, and use typed links/programmatic navigation to the four paths. Preserve tab/bookmark/workspace actions.
- [ ] Migrate the selected-tab action bar to shadcn `Card`, `Badge`, and `Button`; keep controls visible without hover.
- [ ] Run focused tests and typecheck; expect green.
- [ ] Commit with `git commit -m "refactor: extract shared app state and overlays"`.

### Task 4: Extract home, tabs, and workspace route pages

**Files:** `src/features/home/home-page.tsx`, `src/features/tabs/tabs-page.tsx`, `src/features/tabs/live-tabs.tsx`, `src/features/quick-links/quick-links-panel.tsx`, `src/features/todos/todo-panel.tsx`, `src/features/workspaces/workspaces-page.tsx`, `src/components/site-icon.tsx`, `src/components/page-heading.tsx`, `tests/route-pages.test.tsx`

- [ ] Write failing server-render tests for `HomePage`, `TabsPage`, and `WorkspacesPage` using provider snapshots. Assert each page has a unique heading, required actions, and no dependency on a `WorkspaceView` prop.
- [ ] Run `bun test tests/route-pages.test.tsx`; expect missing page modules.
- [ ] Extract `PageHeading` and `SiteIcon` as shared components. Use shadcn `Avatar` with `AvatarFallback` for favicon identity and `Badge` for counts/status.
- [ ] Extract `LiveTabs` and keep TanStack Virtual for large lists. Replace custom buttons, search control, selection checkbox, group header, and menus with shadcn `Button`, `InputGroup`, `Checkbox`, `Badge`, `DropdownMenu`, `Tooltip`, `Skeleton`, and `Empty`. Keep rows 42–46px with 14px titles and 12px metadata.
- [ ] Build `HomePage` by composing `Card` sections for the existing welcome, recent tabs, quick links, todos, recent workspaces, and web search. Cards must use `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter` when an action footer exists.
- [ ] Migrate quick-link and todo controls to generated primitives. Dropdown items remain inside `DropdownMenuGroup`; input validation uses `Field`/`aria-invalid`; destructive actions use shadcn variants.
- [ ] Build `WorkspacesPage` with responsive Tailwind grid utilities, full Card composition, visible restore/menu actions, and an `AlertDialog` before deletion.
- [ ] Run page tests, the full suite, typecheck, and build.
- [ ] Commit with `git commit -m "refactor: componentize primary route pages"`.

### Task 5: Migrate the bookmark route and default every folder to expanded

**Files:** `src/features/bookmarks/bookmarks-page.tsx`, `src/components/bookmark-organizer.tsx`, `tests/bookmark-organizer.test.tsx`, `tests/bookmark-expansion.test.ts`

- [ ] Write a failing pure-state test for `getInitialOrganizerExpansion(catalog)` asserting it returns every folder ID, including nested and empty folders. Write restoration coverage asserting valid persisted IDs are preserved and invalid IDs are removed.
- [ ] Run the bookmark tests; expect the new state helper to be missing or only top-level IDs to be expanded.
- [ ] Export and implement:

```ts
export const BOOKMARK_ORGANIZER_STATE_KEY = 'harbor.bookmarks.organizer.v2'

export function getInitialOrganizerExpansion(catalog: BrowserBookmarkCatalog) {
  return new Set(flattenCatalogFolders(catalog.folders).map((folder) => folder.id))
}
```

Use the versioned key for one persisted object containing `{ selectedFolderId, expandedFolderIds }`. First run uses every folder ID. Later runs restore the user's exact valid set; new folders do not reopen deliberately collapsed existing folders.
- [ ] Create `BookmarksPage` to own the bookmark query/mutation callbacks and render the existing heading plus organizer. Route clicks open new tabs.
- [ ] Recompose the organizer with shadcn `Card`, `InputGroup`, `Button`, `DropdownMenu`, `ScrollArea`, `Select`, `Field`, `Empty`, `Badge`, and `Spinner`. Use Base UI `Select items={...}` and wrap every `SelectItem` in `SelectGroup`. Keep native drag events only for drag mechanics; use semantic Tailwind classes for insertion and folder drop states.
- [ ] Remove organizer-specific primitive CSS. Use Tailwind layout utilities for the 260px/remaining desktop split and the stacked under-700px layout. Keep visible edit/move actions, 14px titles, 12px URLs, and keyboard focus.
- [ ] Run bookmark tests, typecheck, and build.
- [ ] Commit with `git commit -m "refactor: migrate bookmarks to shadcn explorer"`.

### Task 6: Remove the monolith and complete typography/motion cleanup

**Files:** `src/components/dashboard.tsx`, `src/styles/app.css`, `src/lib/types.ts`, `.migration/project.md`, `tests/ui-system.test.ts`

- [ ] Write a failing static test that scans route/feature files and asserts there are no imports from `components/dashboard`, no `WorkspaceView` page-switch prop, no legacy hand-built primitive class names (`primary-button`, `secondary-button`, `dialog-card`, `menu-popover`, `search-field`), and no feature typography below 12px.
- [ ] Run `bun test tests/ui-system.test.ts`; expect legacy dashboard/CSS failures.
- [ ] Delete `src/components/dashboard.tsx`. Remove `WorkspaceView` if no domain consumer remains. Remove old primitive CSS and retain only Tailwind/shadcn theme layers, extension-wide background atmosphere, route animation utilities supplied by the installed animation package, and reduced-motion rules.
- [ ] Audit all buttons with icons for `data-icon`, all avatars for `AvatarFallback`, all dialogs for titles, all menu/select/command items for Group parents, and all conditional classes for `cn()`.
- [ ] Run the required Base migration sweeps:

```bash
rg -n "radix-ui|@radix-ui|asChild|IconPlaceholder" src package.json
rg -n "text-\[(?:[0-9]|1[01])px\]" src
```

Expected: no matches. Update `.migration/project.md` with final dependency and consumer sweep, behavior changes (if none, state none), verification steps, and `0 wrappers remain on Radix`.
- [ ] Run the static UI test, full suite, typecheck, build, and `git diff --check`.
- [ ] Commit with `git commit -m "refactor: remove legacy dashboard ui"`.

### Task 7: Final extension and visual verification

**Files:** no production changes expected; `.migration/project.md` only if verification evidence changes

- [ ] Run fresh verification:

```bash
bun run test
bun run typecheck
bun run build
git diff --check
```

- [ ] Verify `dist/index.html`, `dist/manifest.json`, generated CSS/JS assets, `background.js`, and icons exist. Confirm Manifest V3 permissions remain exactly `tabs`, `tabGroups`, `storage`, `sidePanel`, `bookmarks`, and `favicon`.
- [ ] Start dev preview and capture `/`, `/tabs`, `/bookmarks`, and `/workspaces` at 1440×1000, plus `/bookmarks` at 420×900. Inspect typography, route active state, menu/dialog animation, truncation, overflow, and complete initial bookmark expansion.
- [ ] Load `dist` as an unpacked extension and verify `chrome_url_overrides.newtab`, the side-panel URL, direct `#/bookmarks` navigation, reload on each route, new-tab bookmark opening, edit, drag, import, and export.
- [ ] Inspect `git status`. Commit only refactor-related files and leave `.agents/`, `.claude/`, and `skills-lock.json` untouched.
