# Settings & Account Center Design Specification

- **Date:** 2026-09-04
- **Product:** Tab Harbor Chrome Extension
- **Topic:** Unified Settings Dialog, Preferences, Mock Auth/Sync, and Backup/Restore

## 1. Context & Motivation

Tab Harbor is a calm, local-first browser workspace for Chrome (Manifest V3). Live tabs are runtime state and workspaces are durable user state.
Currently, settings and preferences are fragmented (e.g. search engine in localStorage inside OmniSearch, theme in localStorage inside UI store), there is no centralized settings dialog, no full backup/restore capability, and the header only contains an unclickable static "本地" (Local) badge.

To prepare for future backend integration (user authentication, cloud synchronization across devices) while strictly maintaining the local-first philosophy and quiet reading-desk aesthetic, this feature introduces:
1. **Unified Settings Dialog** (`SettingsDialog`) accessible via Header, `⌘,` keyboard shortcut, and `⌘K` command palette.
2. **User Preferences Layer**: centralized type-safe storage for search engine, clock format (24h/12h), show seconds, and focus/zen mode.
3. **Mock Auth & Sync Layer**: decoupled abstraction (`SyncService`) supporting guest/local mode and simulated login/sync states, ready for zero-refactor backend adoption.
4. **Data Backup & Restore**: one-click JSON export and import (merge or replace modes) with schema validation and cache invalidation.

## 2. Architecture & Data Model

### 2.1 Types (`src/lib/types.ts`)

```typescript
export type ClockFormat = '24h' | '12h'
export type SearchEngineId = 'baidu' | 'google' | 'bing' | 'duckduckgo' | 'github'

export interface UserPreferences {
  defaultSearchEngine: SearchEngineId
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

### 2.2 Storage Keys (`src/lib/storage.ts`)

- `harbor.preferences.v1`: Stores `UserPreferences` (fallback to defaults: `baidu`, `24h`, `true` seconds, `false` focusMode).
- `harbor.auth_session.v1`: Stores `MockUserSession` (fallback to `isLoggedIn: false`, `autoSyncEnabled: false`).

### 2.3 Storage Layer Functions

```typescript
export async function getPreferences(): Promise<UserPreferences>
export async function updatePreferences(patch: Partial<UserPreferences>): Promise<UserPreferences>

export async function getSession(): Promise<MockUserSession>
export async function mockLogin(email: string, name?: string): Promise<MockUserSession>
export async function mockLogout(): Promise<MockUserSession>
export async function mockTriggerSync(): Promise<{ success: boolean; syncedAt: string }>

export async function exportHarborBackup(): Promise<HarborBackupData>
export async function importHarborBackup(
  data: HarborBackupData,
  mode: 'merge' | 'replace'
): Promise<{ success: boolean; workspacesCount: number; quickLinksCount: number; todosCount: number }>
```

## 3. UI Component Design

### 3.1 App Header (`src/features/app/app-shell.tsx`)
- Replace static `<Badge>` with a responsive, quiet button:
  - Local mode (not logged in): Button with `<CircleUserRound />` + label "本地" + small `<Settings />` or chevron, tooltip "设置与账户".
  - Logged in mode: User initials avatar badge + green `<Cloud />` icon indicating sync status.
  - Clicking opens the `SettingsDialog`.
- Global keyboard shortcuts:
  - `⌘,` or `Ctrl+,` toggles `SettingsDialog`.
  - `⌘K` command palette contains options: "打开偏好设置", "导出数据备份", "切换专注模式".

### 3.2 Settings Dialog (`src/features/settings/settings-dialog.tsx`)
Dialog with three tabs:
1. **偏好设置 (Preferences)**:
   - 默认搜索引擎 (Select: Baidu, Google, Bing, DuckDuckGo, GitHub)
   - 时钟显示 (24 小时制 / 12 小时制, 显示秒数 Switch)
   - 极简专注模式 (Switch: 开启后折叠首页 Bento 卡片)
2. **账户与云同步 (Account & Cloud Sync)**:
   - 未登录状态: 展示本地优先理念与即将推出的云同步介绍，提供“一键体验演示账户”或输入邮箱模拟登录。
   - 已登录状态: 展示账户信息、同步状态与“立即同步”演示按钮、退出登录。
   - 明确标注: "当前处于前端静态演示模式，数据安全保存在本地"。
3. **数据备份与迁移 (Backup & Restore)**:
   - 导出: 一键导出 `tab-harbor-backup-YYYY-MM-DD.json`。
   - 导入: 上传 JSON，解析预览内容，支持“合并导入”或“全量覆盖”。
   - 重置: 二次确认重置为默认初始数据。

### 3.3 Integration with Existing Components
- `OmniSearch`: reads default engine from preferences query, updates when settings change.
- `HeroClock`: reads clock format and seconds display from preferences query.
- `HomePage`: reads focusMode; when active, collapses Bento cards and displays a quiet expand button.

## 4. Verification & Testing

- Unit tests for preferences storage & session storage (`tests/settings-storage.test.ts`).
- Unit tests for backup export & import merge/replace logic (`tests/backup-restore.test.ts`).
- UI integration test for `SettingsDialog` rendering and tab switches (`tests/settings-dialog.test.tsx`).
- Typecheck (`bun run typecheck`) and all tests pass (`bun test`).
