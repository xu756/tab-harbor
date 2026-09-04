# Design Document: Bento-Style NewTab Reimplementation with shadcn UI

## 1. Overview & Objectives

Tab Harbor is a calm, local-first Chrome new-tab workspace. This redesign completely reimplements the new-tab home experience using a modern **Bento Glassmorphism** design language, eliminating legacy code baggage while adopting refined shadcn UI components.

### Core Objectives:
1. **Aesthetic Elevation**: Replace dense legacy cards with a spacious, visually delightful Bento Grid featuring frosted acrylic glassmorphism (`backdrop-blur-md`), subtle borders, soft ambient lighting, and refined typography.
2. **Productivity Synergy**: Center-stage Hero section combining dynamic real-time clock, natural warm greetings, and an Omni-Search bar supporting multi-engine switching (Google, Baidu, Bing, DuckDuckGo, GitHub) with instant URL navigation.
3. **Tab & Workspace Centrality**: Fast access to live open tabs with 1-click "Save current tabs to Workspace", quick-restore workspace cards, and a streamlined shortcut matrix.
4. **Clean Code Architecture**: Modularize components with strict single-responsibility boundaries, local-first persistence, reactive TanStack Queries, and full TypeScript safety.

---

## 2. Layout & Visual System

### 2.1 Layout Structure
The NewTab page (`/`) consists of three primary vertical zones:
```
+-------------------------------------------------------------------------+
| [Logo] Harbor           [ 首页 | 标签页 | 书签 | 工作区 ]       [⌘K] [☀/☾] |
+-------------------------------------------------------------------------+
|                                                                         |
|                          10:28:45                                       |
|               早上好，把今天要用的页面留在眼前。                          |
|                                                                         |
|             [🔍 Google ▾] [ 搜索网页或输入网址...               ]          |
|                                                                         |
+-------------------------------------------------------------------------+
|  +---------------------------+  +------------------------------------+  |
|  | 快捷导航矩阵 (Quick Links)  |  | 活动标签速览 (Live Tabs Pulse)      |  |
|  | [GitHub] [Bilibili] ...   |  | 当前 12 个标签 · [存为工作区]       |  |
|  | [+ 添加快捷方式]           |  | [Chip] [Chip] [查看全部 →]          |  |
|  +---------------------------+  +------------------------------------+  |
|  +---------------------------+  +------------------------------------+  |
|  | 工作区快照 (Workspaces)    |  | 今日微待办 (Daily Focus & Todos)   |  |
|  | [工作集 A] [恢复全部]      |  | [完成度 2/5] [添加小事...]         |  |
|  | [工作集 B] [恢复全部]      |  | ☑ 阅读设计文档  ☐ 优化代码结构     |  |
|  +---------------------------+  +------------------------------------+  |
+-------------------------------------------------------------------------+
```

### 2.2 Glassmorphism & Token Styling
- **Card Material**:
  - `bg-card/75 backdrop-blur-md border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 rounded-2xl`
- **Typography**:
  - Heading & Clock: `Geist Variable`, monospace numerical alignment for clock digits (`tabular-nums font-semibold tracking-tight`).
  - Warm subtle subtitles in `text-muted-foreground`.
- **Responsive Breakpoints**:
  - Desktop (>1024px): 2-column or 3-column Bento grid with proportional spans.
  - Tablet (640px - 1024px): 2-column Bento grid.
  - Mobile & Side Panel (<640px): Graceful collapse into a compact single-column feed.

---

## 3. Component Architecture & Detailed Specs

### 3.1 App Header (`src/features/app/app-shell.tsx`)
- Floating frosted glass header bar: `sticky top-0 z-30 border-b border-border/50 bg-background/70 backdrop-blur-xl`.
- Left: Harbor mark and "Browser workspace" label.
- Center: Tab navigation pill (`navigationItems`) with active indicators.
- Right:
  - Command palette quick button (`⌘K`).
  - Theme toggler (`Light / Dark / System`).
  - Local mode indicator badge.

### 3.2 Hero Section
Located in `src/features/home/components/`:
- **`HeroClock`**:
  - Live clock updating every second with `tabular-nums`.
  - Formatted localized date (e.g., `9月4日 星期五`).
  - Smart greeting based on current hour (`夜深了` / `早上好` / `中午好` / `下午好` / `晚上好`).
- **`OmniSearch`**:
  - Pill-shaped search box with glass background and prominent focus ring.
  - Search engine dropdown selector: Google (default), Baidu, Bing, DuckDuckGo, GitHub. Engine selection is stored in `chrome.storage.local`.
  - URL detection: If input matches URL pattern (`http://`, `https://`, `localhost`, or `domain.tld`), direct navigation occurs upon pressing Enter. Otherwise, queries the chosen engine.
  - Shortcut key `/` globally focuses the input field.

### 3.3 Bento Card Modules
1. **`QuickLinksBento`**:
   - Displays custom user bookmarks/shortcuts in a responsive grid.
   - Each tile features high-res favicon via `SiteIcon`, title, and hover menu (`DropdownMenu`).
   - Actions: Open, Open in New Tab, Edit, Delete.
   - "Add Shortcut" button triggers a dedicated shadcn `Dialog` with URL and title fields.
2. **`LiveTabsBento`**:
   - Header shows total open tabs and active windows count.
   - Compact horizontal chips representing the most recently active tabs with close button (`×`) and click-to-activate.
   - Strong CTA: `Button` "一键保存为工作区" opening workspace save modal or quick-saving.
   - Footer link to view full `/tabs` manager.
3. **`WorkspacesBento`**:
   - Lists recently created/modified workspaces.
   - Shows workspace title, tab count badge, and a stacked preview of tab favicons.
   - "全部恢复" button restores all URLs in the workspace with one click via `restoreUrls`.
   - Footer link to full `/workspaces` manager.
4. **`DailyTodoBento`**:
   - Header with counter badge (e.g. `2 / 5 已完成`) and "清理已完成" action button.
   - Quick input to add task on `Enter`.
   - Interactive checkbox using shadcn/Base UI `Checkbox` with smooth line-through and text muted styling.
   - Inline edit and delete via hover actions.

---

## 4. Data Flow & Chrome API Integration

### 4.1 Persistence Model
All durable state is stored locally in `chrome.storage.local` without requiring accounts or cloud backend:
- `quickLinks`: Array of `{ id, title, url, label?, createdAt }`
- `workspaces`: Array of `{ id, name, tabs: { title, url, favIconUrl? }[], createdAt, updatedAt }`
- `todos`: Array of `{ id, text, completed, createdAt }`
- `settings`: Object containing `{ defaultSearchEngine: 'google' | 'baidu' | 'bing' | 'github' | 'duckduckgo' }`

### 4.2 Runtime Tab State
- Queried via `chrome.tabs.query({})` wrapped in TanStack Query (`tabsQueryKey`).
- Synced via event listeners:
  - `chrome.tabs.onCreated`
  - `chrome.tabs.onRemoved`
  - `chrome.tabs.onUpdated`
  - `chrome.tabs.onMoved`
  - `chrome.tabs.onActivated`
- In non-extension browser preview (`bun run dev`), realistic mock tab data is supplied automatically.

---

## 5. Non-Functional Requirements & Chrome Constraints

1. **Fast Load Time**: New tab page must render in under 50ms without layout shift.
2. **CSP Compliance**: Manifest V3 compliant. No external scripts or remote CDN execution.
3. **Keyboard Accessibility**: Keyboard navigation supported for search (`/`), command menu (`⌘K`), tab traversal, and dialog escapes.
4. **No Legacy Debt**: Remove legacy single-column card wall code in favor of modular Bento components.

---

## 6. Verification & Test Plan

1. **Unit & Integration Tests**:
   - Update and execute `bun run test` to guarantee all storage mutations, routing, and component test cases pass.
2. **Type Checking**:
   - Run `bun run typecheck` to confirm zero TypeScript diagnostic issues.
3. **Build Output**:
   - Run `bun run build` to verify clean production compilation into `dist/`.
4. **Manual Extension Validation**:
   - Load unpacked extension from `dist/` into Chrome.
   - Verify NewTab override, search engines, quick links, live tabs, workspaces, and todo features.
