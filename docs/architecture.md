# Harbor 架构说明

本文描述仓库当前运行方式、模块边界和数据归属。Harbor 是为 Chrome Manifest V3 构建的纯客户端 Vite SPA，不包含服务端渲染、hydration 或后端服务。

## 应用入口

`src/main.tsx` 创建 React 根节点和 TanStack Router。根路由依次装配：

```text
QueryClientProvider
└── AppProvider
    └── AppShell
        └── 当前路由 Outlet
```

- `QueryClientProvider` 管理 Chrome API 与本地数据的查询缓存。
- `AppProvider` 订阅标签和书签事件，并提供跨页面对话框、命令菜单与领域数据。
- `AppShell` 提供全局导航、主题入口和响应式页面容器。
- 路由组件只负责组合对应功能，不承担全局初始化。

## 路由

应用使用 TanStack Router 的文件路由和 hash history：

| 路径 | 路由文件 | 功能 |
| --- | --- | --- |
| `/` | `src/routes/index.tsx` | 首页概览 |
| `/tabs` | `src/routes/tabs.tsx` | 当前标签管理 |
| `/bookmarks` | `src/routes/bookmarks.tsx` | Chrome 书签管理 |
| `/workspaces` | `src/routes/workspaces.tsx` | 已保存工作区 |

扩展实际地址形如 `chrome-extension://<id>/index.html#/bookmarks`。hash history 保证 Chrome 始终加载真实存在的 `index.html`，应用路径由客户端路由处理。

## 状态和数据归属

| 数据 | 权威来源 | 访问方式 | 持久化 |
| --- | --- | --- | --- |
| 当前标签和标签组 | Chrome 运行时 | `chrome.tabs`、`chrome.tabGroups` + TanStack Query | 不持久化运行时 ID |
| Chrome 书签 | Chrome 书签库 | `chrome.bookmarks` + TanStack Query | 由 Chrome 管理 |
| 工作区 | Harbor 本地数据 | `chrome.storage.local` | 本机持久化 |
| 快捷入口 | Harbor 本地数据 | `chrome.storage.local` | 本机持久化 |
| 待办 | Harbor 本地数据 | `chrome.storage.local` | 本机持久化 |
| 主题、书签树展开状态 | 页面偏好 | `localStorage` | 本机持久化 |
| 选中标签、命令菜单状态 | TanStack Store | 内存 | 页面刷新后重置 |

`tabId`、`windowId` 和 Chrome `groupId` 只在当前浏览器运行时有效。保存工作区时只保存恢复标签所需的 URL、标题、图标、顺序、固定状态和标签组显示名称。

安装后的扩展中，`chrome.storage.local` 由新标签页和 Side Panel 共享，但不会通过 `chrome.storage.sync` 同步到其他设备。页面 `localStorage` 属于 Harbor 的扩展 origin，因此两种扩展页面也能读取同一份主题和书签树偏好。开发服务器使用 `http://localhost:5173` 自己的 `localStorage`，与已安装扩展的数据隔离。

## Chrome API 适配器

`src/lib/chrome.ts` 是页面功能访问 Chrome API 的边界，负责：

- 查询、激活、关闭和恢复标签；
- 读取标签组信息；
- 读取、更新、移动和导入 Chrome 书签；
- 打开链接和 Chrome 书签管理器；
- 订阅标签、标签组和书签变化。

TanStack Query 使用事件订阅触发失效和重新读取，避免 UI 保存另一份浏览器状态。`bun run dev` 中没有 Chrome 扩展运行时，适配器会返回演示数据并提供可操作的内存书签树，使主要交互可以在普通浏览器检查。

## 前端模块

```text
src/
├── components/
│   ├── ui/                    本地 shadcn 组件
│   └── bookmark-organizer.tsx 双栏书签资源管理器
├── features/
│   ├── app/                   Provider、应用外壳、404 页面
│   ├── home/                  首页
│   ├── tabs/                  当前标签列表
│   ├── bookmarks/             书签路由页面
│   ├── workspaces/            工作区页面
│   └── shared/                跨功能展示组件
├── lib/                       Chrome 适配器、存储、书签算法与类型
├── routes/                    文件路由
├── state/                     TanStack Store UI 状态
└── styles/                    全局主题和版式
```

领域计算尽量保留在 `src/lib/` 的纯函数中，例如书签目录归一化、拖拽目标计算、HTML 解析与序列化。React 组件负责交互状态和展示，Chrome 写操作集中通过适配器执行。

## UI 系统

- 通用控件来自仓库内的 shadcn 组件，并使用 Base UI 作为交互原语。
- Tailwind CSS 4 负责布局和视觉样式；颜色、圆角、阴影和字体通过语义 token 统一。
- Lucide 提供图标；Geist Variable 是主字体。
- 大列表使用 TanStack Virtual，仅渲染可视范围附近的行。
- 动画保持短促，并通过 `motion-reduce` 支持减少动态效果偏好。

功能代码优先组合 `src/components/ui/` 中已有组件。全局主题规则放在 `src/styles/app.css`，组件局部布局使用 Tailwind class。

## 构建与扩展页面

Vite 将 `index.html` 和 `src/` 构建到 `dist/`，并复制 `public/` 中的 Manifest、Service Worker 和图标。`public/manifest.json` 配置：

- 新标签页覆盖到 `index.html`；
- Side Panel 指向 `index.html#/?surface=sidepanel`；
- 扩展图标通过 Service Worker 打开 Side Panel。

Manifest V3 页面必须保持 CSP 安全：不使用内联可执行脚本，不从 CDN 加载运行时代码，也不使用动态远程模块。

## 验证

提交功能前执行：

```bash
bun install
bun run test
bun run typecheck
bun run build
```

随后把 `dist/` 加载为未打包扩展，至少检查：

1. 新标签页和 Side Panel 都能启动。
2. 四条路由可以直接进入并相互导航。
3. 标签和书签在 Chrome 状态变化后刷新。
4. 本地工作区、快捷入口、待办和页面偏好在刷新后保留。
5. 控制台没有 CSP、路由或 Chrome API 错误。
