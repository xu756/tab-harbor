# Harbor

Harbor 是一个 Local First 的 Chrome 浏览器工作空间，把 **标签、Chrome 书签、快捷入口、待办和工作区** 放在同一个安静、紧凑的新标签页里。

仓库仍保留 `tab-harbor` 名称，V2 的产品名称调整为 **Harbor**。

## 当前产品结构

- **首页**：问候 / 网页搜索 / 当前标签 / 快捷入口 / 待办 / 最近工作区。
- **标签**：读取 Chrome 全部普通 Tabs 和原生 Tab Groups，支持搜索、多选、关闭、重复检测和保存。
- **书签**：读取完整 `chrome.bookmarks` 树，按文件夹展示并支持搜索、打开、新标签打开。
- **工作区**：将一组 Tabs 持久化到本地，支持恢复、重命名和删除。
- **Side Panel**：复用同一套应用作为辅助入口。

当前不接后端，不需要登录即可完整使用本地功能。

## 技术栈

Harbor 是一个 Manifest V3 SPA，不使用 SSR / hydration：

- React 19 + TypeScript
- Vite
- TanStack Router
- TanStack Query
- TanStack Store
- TanStack Virtual
- TanStack Form
- Lucide Icons
- Bun

TanStack Router 负责页面状态，Query 管理 Chrome API / 本地数据查询与 mutation，Store 管理瞬时 UI 状态，Virtual 用于大量 Tabs / Bookmarks，Form 用于工作区和快捷入口编辑。

## 本地数据

使用 `chrome.storage.local` 保存：

- Workspaces
- Quick Links
- Todos

开发预览环境自动回退到 `localStorage`，并使用 Demo Tabs / Bookmarks。

Chrome 的 `tabId`、`windowId`、`groupId` 只属于浏览器运行时，不作为持久实体 ID。隐身窗口标签默认不会保存到工作区。

## Chrome 权限

V2 当前只申请实现现有功能需要的权限：

```text
tabs
tabGroups
storage
sidePanel
bookmarks
favicon
```

## 开发

```bash
bun install
bun run dev
```

## 构建扩展

```bash
bun run typecheck
bun run test
bun run build
```

然后在 `chrome://extensions` 打开开发者模式，加载：

```text
dist/
```

重点验证：

1. 新标签页正常打开 Harbor。
2. Manifest V3 控制台没有 inline script / CSP 报错。
3. Tabs / Tab Groups 实时刷新。
4. Chrome 全部书签可读取和搜索。
5. Quick Links / Todos / Workspaces 刷新后仍保留。
6. 点击扩展图标可以打开 Side Panel。

## 后续

账号、Cloud Sync、多设备 Session、Send to Device、Inbox 和同步冲突处理仍属于下一阶段；本分支先把本地产品体验和数据模型做稳定。
