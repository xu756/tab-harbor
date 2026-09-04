# Settings & Account Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a centralized Settings and Account Center for Tab Harbor with user preferences, mock cloud sync, and JSON backup/restore, decoupled and local-first.

**Architecture:** Add a strongly typed preferences and mock session layer in storage (`src/lib/storage.ts`), integrate with TanStack Query in `AppProvider`, build a clean tabbed `SettingsDialog` with shadcn Base UI primitives, wire up Header entry point and `⌘,` keyboard shortcut, and connect `HeroClock`, `OmniSearch`, and `HomePage` to dynamic preferences.

**Tech Stack:** React 19, TypeScript, TanStack Query, TanStack Form, Base UI / shadcn, Tailwind CSS 4, Bun Test.

## Global Constraints

- Must run CSP-safe in Manifest V3 (no external remote scripts).
- Keep local mode fully functional without network or account.
- Preserve quiet reading-desk aesthetic: compact rows, low visual noise, warm neutral surfaces.
- Do not duplicate bookmark trees or leak cloud IDs into local storage keys.
- All tests must pass with `bun test` and `bun run typecheck`.

---

### Task 1: Type Definitions and Storage for Preferences & Session

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/storage.ts`
- Test: `tests/settings-storage.test.ts`

**Interfaces:**
- Consumes: `Workspace`, `QuickLink`, `TodoItem` from `src/lib/types.ts`
- Produces: `UserPreferences`, `MockUserSession`, `HarborBackupData` types; `getPreferences()`, `updatePreferences()`, `getSession()`, `mockLogin()`, `mockLogout()`, `mockTriggerSync()` from `src/lib/storage.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/settings-storage.test.ts`:
```typescript
import { beforeEach, expect, test } from 'bun:test'
import {
  getPreferences,
  getSession,
  mockLogin,
  mockLogout,
  mockTriggerSync,
  updatePreferences,
} from '../src/lib/storage'

beforeEach(() => {
  window.localStorage.clear()
})

test('returns default user preferences', async () => {
  const prefs = await getPreferences()
  expect(prefs.defaultSearchEngine).toBe('baidu')
  expect(prefs.clockFormat).toBe('24h')
  expect(prefs.showClockSeconds).toBe(true)
  expect(prefs.focusMode).toBe(false)
})

test('updates and persists user preferences partially', async () => {
  const updated = await updatePreferences({ clockFormat: '12h', focusMode: true })
  expect(updated.clockFormat).toBe('12h')
  expect(updated.focusMode).toBe(true)
  expect(updated.defaultSearchEngine).toBe('baidu')

  const reloaded = await getPreferences()
  expect(reloaded.clockFormat).toBe('12h')
  expect(reloaded.focusMode).toBe(true)
})

test('handles mock session login, sync, and logout', async () => {
  const initialSession = await getSession()
  expect(initialSession.isLoggedIn).toBe(false)

  const loggedIn = await mockLogin('test@tabharbor.dev', 'Tester')
  expect(loggedIn.isLoggedIn).toBe(true)
  expect(loggedIn.user?.email).toBe('test@tabharbor.dev')
  expect(loggedIn.user?.name).toBe('Tester')

  const syncResult = await mockTriggerSync()
  expect(syncResult.success).toBe(true)
  expect(syncResult.syncedAt).toBeDefined()

  const afterSync = await getSession()
  expect(afterSync.lastSyncedAt).toBe(syncResult.syncedAt)

  const loggedOut = await mockLogout()
  expect(loggedOut.isLoggedIn).toBe(false)
  expect(loggedOut.user).toBeUndefined()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/settings-storage.test.ts`
Expected: FAIL with missing exports (`getPreferences`, `updatePreferences`, etc.)

- [ ] **Step 3: Implement types and storage methods**

In `src/lib/types.ts`, append:
```typescript
export type ClockFormat = '24h' | '12h'

export interface UserPreferences {
  defaultSearchEngine: string
  clockFormat: ClockFormat
  showClockSeconds: boolean
  focusMode: boolean
}

export interface MockUserSession {
  isLoggedIn: boolean
  user?: {
    id: string
    email: string
    name: string
    avatarUrl?: string
    plan: 'free' | 'pro'
    joinedAt: string
  }
  lastSyncedAt?: string
  autoSyncEnabled: boolean
}

export interface HarborBackupData {
  version: 1
  exportedAt: string
  workspaces: Workspace[]
  quickLinks: QuickLink[]
  todos: TodoItem[]
  preferences: UserPreferences
}
```

In `src/lib/storage.ts`, add keys and implementations:
```typescript
const PREFERENCES_KEY = 'harbor.preferences.v1'
const AUTH_SESSION_KEY = 'harbor.auth_session.v1'

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultSearchEngine: 'baidu',
  clockFormat: '24h',
  showClockSeconds: true,
  focusMode: false,
}

const DEFAULT_SESSION: MockUserSession = {
  isLoggedIn: false,
  autoSyncEnabled: false,
}

export async function getPreferences(): Promise<UserPreferences> {
  const val = await readValue<UserPreferences>(PREFERENCES_KEY)
  return { ...DEFAULT_PREFERENCES, ...(val ?? {}) }
}

export async function updatePreferences(patch: Partial<UserPreferences>): Promise<UserPreferences> {
  const current = await getPreferences()
  const next = { ...current, ...patch }
  await writeValue(PREFERENCES_KEY, next)
  return next
}

export async function getSession(): Promise<MockUserSession> {
  const val = await readValue<MockUserSession>(AUTH_SESSION_KEY)
  return { ...DEFAULT_SESSION, ...(val ?? {}) }
}

export async function mockLogin(email: string, name?: string): Promise<MockUserSession> {
  const session: MockUserSession = {
    isLoggedIn: true,
    user: {
      id: crypto.randomUUID(),
      email: email.trim(),
      name: name?.trim() || email.split('@')[0],
      plan: 'free',
      joinedAt: new Date().toISOString(),
    },
    autoSyncEnabled: true,
    lastSyncedAt: new Date().toISOString(),
  }
  await writeValue(AUTH_SESSION_KEY, session)
  return session
}

export async function mockLogout(): Promise<MockUserSession> {
  await writeValue(AUTH_SESSION_KEY, DEFAULT_SESSION)
  return DEFAULT_SESSION
}

export async function mockTriggerSync(): Promise<{ success: boolean; syncedAt: string }> {
  const current = await getSession()
  const syncedAt = new Date().toISOString()
  if (current.isLoggedIn) {
    await writeValue(AUTH_SESSION_KEY, { ...current, lastSyncedAt: syncedAt })
  }
  return { success: true, syncedAt }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/settings-storage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/storage.ts tests/settings-storage.test.ts
git commit -m "feat(storage): add user preferences and mock session persistence"
```

---

### Task 2: Data Backup Export and Import Logic

**Files:**
- Modify: `src/lib/storage.ts`
- Test: `tests/backup-restore.test.ts`

**Interfaces:**
- Consumes: `listWorkspaces`, `listQuickLinks`, `listTodos`, `getPreferences`
- Produces: `exportHarborBackup()`, `importHarborBackup()`, `resetAllData()`

- [ ] **Step 1: Write the failing test**

Create `tests/backup-restore.test.ts`:
```typescript
import { beforeEach, expect, test } from 'bun:test'
import {
  createTodo,
  createWorkspace,
  exportHarborBackup,
  getPreferences,
  importHarborBackup,
  listQuickLinks,
  listTodos,
  listWorkspaces,
  resetAllData,
  saveQuickLink,
  updatePreferences,
} from '../src/lib/storage'
import type { HarborBackupData } from '../src/lib/types'

beforeEach(() => {
  window.localStorage.clear()
})

test('exports comprehensive backup bundle with schema version', async () => {
  await createWorkspace('测试工作区', [
    { id: 1, windowId: 1, index: 0, title: 'GitHub', url: 'https://github.com', active: true, pinned: false, audible: false, discarded: false, groupId: -1, incognito: false },
  ])
  await saveQuickLink({ title: 'Vercel', url: 'https://vercel.com', label: 'VC' })
  await createTodo('完成单测')
  await updatePreferences({ clockFormat: '12h' })

  const backup = await exportHarborBackup()
  expect(backup.version).toBe(1)
  expect(backup.exportedAt).toBeDefined()
  expect(backup.workspaces.length).toBe(1)
  expect(backup.workspaces[0].name).toBe('测试工作区')
  expect(backup.quickLinks.some((l) => l.title === 'Vercel')).toBe(true)
  expect(backup.todos.length).toBe(1)
  expect(backup.preferences.clockFormat).toBe('12h')
})

test('imports backup in replace mode and merge mode', async () => {
  const dummyBackup: HarborBackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    workspaces: [
      { id: 'ws-1', name: '导入的工作区', createdAt: '', updatedAt: '', tabs: [] },
    ],
    quickLinks: [
      { id: 'ql-1', title: 'Google', url: 'https://google.com', label: 'GG' },
    ],
    todos: [
      { id: 'td-1', text: '导入的任务', completed: false, createdAt: '', updatedAt: '' },
    ],
    preferences: {
      defaultSearchEngine: 'google',
      clockFormat: '12h',
      showClockSeconds: false,
      focusMode: true,
    },
  }

  // Replace mode
  const resReplace = await importHarborBackup(dummyBackup, 'replace')
  expect(resReplace.success).toBe(true)
  const workspaces = await listWorkspaces()
  expect(workspaces.length).toBe(1)
  expect(workspaces[0].name).toBe('导入的工作区')

  const prefs = await getPreferences()
  expect(prefs.defaultSearchEngine).toBe('google')
  expect(prefs.focusMode).toBe(true)

  // Merge mode
  await createWorkspace('本地新建工作区', [])
  const resMerge = await importHarborBackup(dummyBackup, 'merge')
  expect(resMerge.success).toBe(true)
  const mergedWorkspaces = await listWorkspaces()
  expect(mergedWorkspaces.length).toBe(2)
})

test('validates backup schema and rejects invalid payload', async () => {
  // @ts-expect-error test invalid payload
  expect(importHarborBackup({ foo: 'bar' }, 'replace')).rejects.toThrow()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/backup-restore.test.ts`
Expected: FAIL with `exportHarborBackup is not a function`

- [ ] **Step 3: Implement exportHarborBackup, importHarborBackup, and resetAllData**

In `src/lib/storage.ts`:
```typescript
export async function exportHarborBackup(): Promise<HarborBackupData> {
  const [workspaces, quickLinks, todos, preferences] = await Promise.all([
    listWorkspaces(),
    listQuickLinks(),
    listTodos(),
    getPreferences(),
  ])
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    workspaces,
    quickLinks,
    todos,
    preferences,
  }
}

export async function importHarborBackup(
  data: HarborBackupData,
  mode: 'merge' | 'replace',
): Promise<{ success: boolean; workspacesCount: number; quickLinksCount: number; todosCount: number }> {
  if (!data || data.version !== 1 || !Array.isArray(data.workspaces) || !Array.isArray(data.quickLinks)) {
    throw new Error('无效的备份文件格式。')
  }

  if (mode === 'replace') {
    await writeValue(WORKSPACES_KEY, data.workspaces)
    await writeValue(QUICK_LINKS_KEY, data.quickLinks)
    await writeValue(TODOS_KEY, data.todos ?? [])
    if (data.preferences) {
      await writeValue(PREFERENCES_KEY, data.preferences)
    }
    return {
      success: true,
      workspacesCount: data.workspaces.length,
      quickLinksCount: data.quickLinks.length,
      todosCount: (data.todos ?? []).length,
    }
  }

  // Merge mode: merge by ID
  const [currentWorkspaces, currentQuickLinks, currentTodos, currentPrefs] = await Promise.all([
    listWorkspaces(),
    listQuickLinks(),
    listTodos(),
    getPreferences(),
  ])

  const existingWsIds = new Set(currentWorkspaces.map((w) => w.id))
  const newWorkspaces = [...currentWorkspaces, ...data.workspaces.filter((w) => !existingWsIds.has(w.id))]

  const existingQlIds = new Set(currentQuickLinks.map((q) => q.id))
  const newQuickLinks = [...currentQuickLinks, ...data.quickLinks.filter((q) => !existingQlIds.has(q.id))]

  const existingTdIds = new Set(currentTodos.map((t) => t.id))
  const newTodos = [...currentTodos, ...(data.todos ?? []).filter((t) => !existingTdIds.has(t.id))]

  await writeValue(WORKSPACES_KEY, newWorkspaces)
  await writeValue(QUICK_LINKS_KEY, newQuickLinks)
  await writeValue(TODOS_KEY, newTodos)
  if (data.preferences) {
    await writeValue(PREFERENCES_KEY, { ...currentPrefs, ...data.preferences })
  }

  return {
    success: true,
    workspacesCount: newWorkspaces.length,
    quickLinksCount: newQuickLinks.length,
    todosCount: newTodos.length,
  }
}

export async function resetAllData() {
  await writeValue(WORKSPACES_KEY, [])
  await writeValue(QUICK_LINKS_KEY, defaultQuickLinks)
  await writeValue(TODOS_KEY, [])
  await writeValue(PREFERENCES_KEY, DEFAULT_PREFERENCES)
  await writeValue(AUTH_SESSION_KEY, DEFAULT_SESSION)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/backup-restore.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts tests/backup-restore.test.ts
git commit -m "feat(storage): implement backup export, import, and data reset"
```

---

### Task 3: AppProvider Integration for Preferences and Session

**Files:**
- Modify: `src/features/app/app-provider.tsx`
- Modify: `src/state/ui-store.ts`

**Interfaces:**
- Consumes: `getPreferences`, `updatePreferences`, `getSession`, `mockLogin`, `mockLogout`, `mockTriggerSync`
- Produces: Query keys `preferencesQueryKey`, `sessionQueryKey`; `useApp()` exposed values: `preferences`, `session`, `updatePreferencesMutation`, `loginMutation`, `logoutMutation`, `triggerSyncMutation`, `settingsOpen`, `setSettingsOpen`

- [ ] **Step 1: Add `settingsOpen` to UI store**

In `src/state/ui-store.ts`, add:
```typescript
interface UiState {
  tabSearch: string
  selectedTabIds: number[]
  commandOpen: boolean
  settingsOpen: boolean
  theme: ThemeMode
}

// In Store initial state:
settingsOpen: false,

// Helper export:
export function setSettingsOpen(settingsOpen: boolean) {
  uiStore.setState((state) => ({ ...state, settingsOpen }))
}
```

- [ ] **Step 2: Add queries & mutations to `AppProvider`**

In `src/features/app/app-provider.tsx`:
Export query keys:
```typescript
export const preferencesQueryKey = ['preferences'] as const
export const sessionQueryKey = ['auth-session'] as const
```
Expose `preferences`, `session`, `openSettings: (tab?: string) => void`, etc. in `AppContextValue`.
Add `⌘,` keyboard listener to toggle settings dialog.

- [ ] **Step 3: Run existing tests to verify backward compatibility**

Run: `bun test`
Expected: PASS (all 32 existing tests + 2 new test files pass)

- [ ] **Step 4: Commit**

```bash
git add src/state/ui-store.ts src/features/app/app-provider.tsx
git commit -m "feat(app): integrate preferences and auth session into AppProvider and ui-store"
```

---

### Task 4: SettingsDialog Component Implementation

**Files:**
- Create: `src/features/settings/settings-dialog.tsx`
- Test: `tests/settings-dialog.test.tsx`

**Interfaces:**
- Consumes: `useApp`, shadcn dialog, button, select, input
- Produces: `<SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />`

- [ ] **Step 1: Write the failing test**

Create `tests/settings-dialog.test.tsx`:
```typescript
import { expect, test } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { SettingsDialogView } from '../src/features/settings/settings-dialog'

test('renders SettingsDialog with tabs for preferences, account, and backup', () => {
  const html = renderToString(
    <SettingsDialogView
      open={true}
      onOpenChange={() => {}}
      preferences={{
        defaultSearchEngine: 'baidu',
        clockFormat: '24h',
        showClockSeconds: true,
        focusMode: false,
      }}
      session={{
        isLoggedIn: false,
        autoSyncEnabled: false,
      }}
      onUpdatePreferences={() => {}}
      onLogin={() => {}}
      onLogout={() => {}}
      onSync={() => {}}
      onExportBackup={() => {}}
      onImportBackup={() => {}}
      onResetData={() => {}}
    />
  )

  expect(html).toContain('偏好设置')
  expect(html).toContain('账户与同步')
  expect(html).toContain('数据备份')
  expect(html).toContain('默认搜索引擎')
  expect(html).toContain('专注模式')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/settings-dialog.test.tsx`
Expected: FAIL with module not found `settings-dialog`

- [ ] **Step 3: Implement SettingsDialog**

Create `src/features/settings/settings-dialog.tsx`:
- Render tab navigation (偏好设置, 账户与同步, 数据备份与迁移)
- Tab 1 (偏好设置):
  - 搜索引擎下拉选择 (Baidu, Google, Bing, DuckDuckGo, GitHub)
  - 时钟格式 (24小时制 / 12小时制 单选或切换按钮)
  - 秒数显示勾选框
  - 首页专注模式开关
- Tab 2 (账户与同步 - 静态演示):
  - 当 `session.isLoggedIn === false`:
    - 展示本地优先说明卡片
    - 提供“快速登录演示账户”按钮（点击直接调用 `mockLogin('demo@tabharbor.dev', 'Harbor Explorer')`）
    - 邮箱输入框 + 模拟登录
  - 当 `session.isLoggedIn === true`:
    - 展示账户头像/名称、邮箱、Pro徽章
    - 展示上次同步时间、立即同步按钮（带 loading 状态）
    - 退出登录按钮
- Tab 3 (数据备份与迁移):
  - 导出 JSON 按钮（动态触发 Blob 下载）
  - 导入 JSON 文件选择器，解析并确认是“合并导入”还是“全量覆盖”
  - 危险区：清空并重置所有本地数据（带确认弹窗）

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/settings-dialog.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/settings/settings-dialog.tsx tests/settings-dialog.test.tsx
git commit -m "feat(settings): add comprehensive SettingsDialog component"
```

---

### Task 5: AppShell & Header Integration

**Files:**
- Modify: `src/features/app/app-shell.tsx`
- Modify: `src/features/app/app-provider.tsx`
- Test: `tests/app-shell-settings.test.tsx`

**Interfaces:**
- Consumes: `<SettingsDialog />`, `setSettingsOpen`, `useApp`
- Produces: Updated header button with dynamic local/logged-in status and settings dialog modal in root.

- [ ] **Step 1: Write test for Header settings entry**

Create `tests/app-shell-settings.test.tsx`:
```typescript
import { expect, test } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { AccountBadge } from '../src/features/app/app-shell'

test('renders AccountBadge in local mode', () => {
  const html = renderToString(<AccountBadge session={{ isLoggedIn: false, autoSyncEnabled: false }} onClick={() => {}} />)
  expect(html).toContain('本地模式')
})

test('renders AccountBadge in logged in mode with sync indicator', () => {
  const html = renderToString(
    <AccountBadge
      session={{
        isLoggedIn: true,
        user: { id: '1', email: 'test@example.com', name: 'Alex', plan: 'pro', joinedAt: '' },
        autoSyncEnabled: true,
      }}
      onClick={() => {}}
    />
  )
  expect(html).toContain('Alex')
})
```

- [ ] **Step 2: Update AppShell & AppProvider**

- In `src/features/app/app-shell.tsx`:
  - Export `AccountBadge` and place it in the top-right header action bar.
  - Clicking `AccountBadge` opens `setSettingsOpen(true)`.
  - Add `<SettingsDialog />` to `AppProvider` dialog list.
  - In `GlobalCommandMenu`, add command: `<CommandItem onSelect={() => setSettingsOpen(true)}><Settings />偏好设置与账户<CommandShortcut>⌘,</CommandShortcut></CommandItem>`.

- [ ] **Step 3: Run tests and verify**

Run: `bun test tests/app-shell-settings.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/app/app-shell.tsx src/features/app/app-provider.tsx tests/app-shell-settings.test.tsx
git commit -m "feat(app): add AccountBadge and settings integration to AppShell"
```

---

### Task 6: Integrate HomePage, OmniSearch & HeroClock with Preferences

**Files:**
- Modify: `src/features/home/components/hero-clock.tsx`
- Modify: `src/features/home/components/omni-search.tsx`
- Modify: `src/features/home/home-page.tsx`
- Test: `tests/hero-components.test.tsx`

**Interfaces:**
- Consumes: `useApp().preferences`
- Produces: Dynamic clock format (12h/24h, seconds toggle), search engine default from preferences, and collapsible Bento cards on `focusMode: true`.

- [ ] **Step 1: Update HeroClock to accept `format` and `showSeconds`**

In `src/features/home/components/hero-clock.tsx`:
Support `format?: '24h' | '12h'` and `showSeconds?: boolean`.
Calculate hours in 12h format (with am/pm or 12h representation) when requested.
Show/hide seconds based on `showSeconds`.

- [ ] **Step 2: Update OmniSearch to sync with `preferences.defaultSearchEngine`**

In `src/features/home/components/omni-search.tsx`:
Sync default engine with `preferences.defaultSearchEngine` when available.

- [ ] **Step 3: Update HomePage to honor `preferences.focusMode`**

In `src/features/home/home-page.tsx`:
If `preferences.focusMode` is true:
- Keep `HeroClock` and `OmniSearch` prominently displayed.
- Show a discreet expand/collapse toggle at the bottom ("查看组件" / "专注模式已开启").

- [ ] **Step 4: Run all hero and home tests**

Run: `bun test tests/hero-components.test.tsx tests/home-bento.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/home/ components/ tests/
git commit -m "feat(home): connect HeroClock, OmniSearch, and HomePage to dynamic preferences"
```

---

### Task 7: Full Verification & Typecheck

**Files:**
- All touched files

- [ ] **Step 1: Run complete test suite**

Run: `bun test`
Expected: All tests pass (0 failures).

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: Clean exit code 0.

- [ ] **Step 3: Run extension build**

Run: `bun run build`
Expected: Clean build output in `dist/`.

- [ ] **Step 4: Final commit and summary**

```bash
git status
```
