# Harbor

[English](./README.md)

Harbor 是一个安静、Local First 的 Chrome 浏览器工作空间，把当前标签、Chrome 书签、快捷入口、待办和已保存工作区集中到新标签页中，也可以在侧边栏使用。

扩展无需账号或后端即可工作。浏览器数据由 Chrome 管理，Harbor 的持久数据保存在本机。

## 功能

- **首页**：网页搜索、当前标签、可编辑快捷入口、待办和最近工作区。
- **标签**：搜索普通 Chrome 标签和原生标签组，多选、关闭、查找重复标签，并把选中的标签保存为工作区。
- **书签**：以双栏资源管理器查看真实 Chrome 书签树；按名称、网址或文件夹搜索；编辑书签；拖拽排序或跨文件夹移动；通过“移动到”操作完成键盘可达的移动；导入、导出书签 HTML。
- **工作区**：把一组标签持久化到本机，并支持恢复、重命名和删除。
- **命令菜单**：按 `Ctrl+K` 或 `⌘K` 搜索标签、书签、工作区和常用操作。
- **侧边栏**：在窄宽度下使用同一套应用。

第一次进入书签页时，文件夹树默认全部展开；之后会记住选中的文件夹和展开状态。右侧书签列表在普通浏览时只显示名称，网址仅在编辑状态显示。

## 路由

所有扩展页面都加载同一个 `index.html`，因此应用使用 hash history。

| 路由 | 页面 |
| --- | --- |
| `#/` | 首页 |
| `#/tabs` | 标签 |
| `#/bookmarks` | 书签 |
| `#/workspaces` | 工作区 |

## 技术栈

- React 19 + TypeScript
- Vite + Manifest V3
- TanStack Router、Query、Store、Virtual、Form
- 基于 Base UI 的 shadcn 组件
- Tailwind CSS 4 + Lucide Icons
- Bun

当前应用是纯客户端 SPA，不使用 SSR 或 hydration。扩展页面不会从 CDN 加载运行时代码。

## 本地开发

需要安装当前版本的 Bun，并准备一个 Chromium 内核浏览器。

```bash
bun install
bun run dev
```

开发服务器默认位于 `http://localhost:5173`。普通浏览器无法访问 Chrome 扩展 API，页面会提供具有代表性的演示标签和书签；书签改动只在内存中保留到页面刷新。工作区、快捷入口和待办使用开发地址自己的 `localStorage`。

## 构建和安装

```bash
bun run test
bun run typecheck
bun run build
```

构建结果位于 `dist/`。

1. 打开 `chrome://extensions`。
2. 开启“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择当前仓库的 `dist/` 目录。
5. 打开新标签页，并通过扩展图标检查侧边栏。

再次构建后，先在 `chrome://extensions` 中点击 Harbor 的“重新加载”，再验证更新后的文件。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `bun run dev` | 启动浏览器开发预览 |
| `bun run test` | 运行测试 |
| `bun run typecheck` | 检查 TypeScript 类型 |
| `bun run build` | 构建扩展并检查类型 |
| `bun run preview` | 预览生产构建 |

## 目录结构

```text
src/
  components/       shadcn 通用组件和书签资源管理器
  features/         应用外壳和路由级功能
  lib/              Chrome 适配器、本地持久化和领域逻辑
  routes/           TanStack Router 路由模块
  state/            瞬时 UI 状态
  styles/           全局主题和布局 token
public/              Manifest、Service Worker 和扩展图标
docs/                架构、书签和设计规范
```

详细说明见[架构说明](./docs/architecture.md)、[Chrome 书签](./docs/bookmarks.md)、[设计原则](./docs/design-principles.md)和[隐私说明](./PRIVACY.md)。

## Chrome 权限

| 权限 | 用途 |
| --- | --- |
| `tabs` | 读取、激活、关闭和恢复普通标签 |
| `tabGroups` | 读取 Chrome 原生标签组信息 |
| `bookmarks` | 读取书签，并执行用户发起的编辑、移动、导入和导出 |
| `storage` | 在本机保存工作区、快捷入口和待办 |
| `sidePanel` | 提供侧边栏入口 |
| `favicon` | 显示网站标识，无需另行请求远程图片 |

隐身窗口中的标签不会进入 Harbor 的持久工作区数据。
