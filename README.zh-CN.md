# Tab Harbor

Tab Harbor 是一个安静、Local First 的 Chrome 浏览器工作空间，用来管理当前标签页，并把临时浏览状态整理成可以反复恢复的工作空间。

V2 开始不再使用原来的纯 HTML / CSS / 多脚本架构，前端整体重构为 TanStack 技术栈。

## 产品模型

- **Live Tabs / 当前标签页**：Chrome 当前真实打开的标签页，属于运行时状态。
- **Workspace / 工作空间**：长期保存的 URL 集合，属于持久数据。
- **Devices / 设备**：当前只实现产品界面骨架，还没有接入账号和云同步。
- **New Tab**：主工作台。
- **Side Panel**：辅助快速入口。

## 技术栈

- TanStack Start（SPA Mode）
- TanStack Router
- TanStack Query
- TanStack Store
- TanStack Virtual
- TanStack Form
- React 19 + TypeScript
- Vite + Bun
- Chrome Manifest V3

## 当前 V2 已实现

- 读取 Chrome 全部普通标签页和原生 Tab Group
- 没有原生分组的标签按域名辅助聚合
- 约 42px 的高密度标签列表
- 标题 / URL 搜索
- 点击切换标签页
- 关闭标签页
- 多选及批量关闭 / 保存
- 重复 URL 检测
- 保存全部、某个分组或选中的标签为工作空间
- 工作空间恢复到新 Chrome Window
- 删除本地工作空间
- `Ctrl/Cmd + K` 全局命令面板
- Light / Dark / System 主题
- 扩展图标直接打开 Side Panel
- 非扩展开发环境自动使用 Demo Tabs，方便直接 `bun run dev`
- 设备与登录页面已经预留，但当前不会连接任何后端

## 本地数据

工作空间使用 `chrome.storage.local` 保存；普通浏览器开发预览使用 `localStorage` 回退。

Chrome 的 `tabId`、`windowId`、`groupId` 只作为运行时 ID，不作为未来云端实体 ID。隐身窗口标签默认不会进入本地工作空间模型。

## 本地开发

```bash
bun install
bun run dev
```

不是从 Chrome 扩展环境打开时，页面会显示 Demo 标签数据，因此 UI 可以独立开发。

## 构建 Chrome 扩展

```bash
bun install
bun run typecheck
bun run build
```

然后在 `chrome://extensions` 中选择 **加载已解压的扩展程序**，加载：

```text
dist/client
```

至少验证：

1. 新标签页能够正常替换为 Tab Harbor。
2. 点击插件图标能够打开 Side Panel。
3. 当前真实 Tabs / Tab Groups 正确显示。
4. 保存工作空间后，Chrome 重启仍能恢复。
5. Chrome 控制台没有 Manifest V3 inline script / CSP 报错。

## 后端状态

这个分支当前 **不接后端**。登录、多设备 Session、Cloud Sync、Send to Device、Inbox、同步冲突处理都留到下一阶段。

## 当前重构分支

```text
refactor/tanstack-start
```

V2 在浏览器中完成验证后再合并到 `main`。
