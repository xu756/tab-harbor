# Tab Harbor

[English](README.md) | [简体中文](README.zh-CN.md)

**一个更安静的新标签页工作台，把打开中的标签、快捷链接、待读和轻量待办收进同一个顺手的空间里。**

Tab Harbor 会把 Chrome 的新标签页变成一个可以继续工作的地方。你会先看到自己现在到底开了什么、哪些页面应该暂时收入待读、还有哪些事情还没处理完。

<p align="center">
  <img src="assets/readme/feature-tabs.png" alt="Tab Harbor 总览" width="760">
</p>


## ✨ 核心亮点

- **标签页按域名自动整理。** Tab Harbor 会按域名整理打开中的页面，把首页型标签单独收到 `Homepages` 分组里，让你先看清自己到底在处理什么。
- **自动分组之外，你也还能按自己的工作流继续整理。** 当域名分组不够用时，你可以创建手动分组、保留常用的 quick links，并通过顶部图标很快跳回需要的区域。
- **“稍后读”和“待办”会收入抽屉，和工作区区分开，且无需打开额外软件。** 搜索、恢复或归档，而不是一直挂在浏览器顶部占着位置。
- **它也不只是一个整理标签页的工具。** Quick links、Todos、打开中的标签页和待读内容都在同一个新标签页里，下一步要做什么通常就在眼前。
- **它尽量让工作台更安静，但不让系统更重。** 你可以切换主题、调透明度、换背景图，也可以一键清理重复标签页；同时所有数据都还是保存在 `chrome.storage.local`，不需要服务器也不需要账号。

## 🖼️ 功能展示

<table>
  <tr>
    <td width="33.33%" valign="top">
      <strong>标签页统一管理</strong><br><br>
      <img src="assets/readme/feature-tabs.png" alt="标签页" width="100%">
    </td>
    <td width="33.33%" valign="top">
      <strong>待读处理</strong><br><br>
      <img src="assets/readme/feature-saved-drawer.png" alt="待读抽屉" width="100%">
    </td>
    <td width="33.33%" valign="top">
      <strong>待办和跳转</strong><br><br>
      <img src="assets/readme/feature-todos.png" alt="待办" width="100%">
    </td>
  </tr>
</table>

### 标签页统一管理

Tab Harbor 会把标签页整理成更像工作区的结构：**按域名分组、支持手动分组、保留快捷入口，并且能从顶部图标快速跳回对应区域**；想把浏览器收拾利落一点时，**也可以一键清理重复标签页**。

### 待读处理

那些“现在先不看，但之后一定要回来”的页面，可以**先收入右侧抽屉，之后再搜索、恢复或归档**，而不是永远挂在浏览器顶部。

### 待办和跳转

除了整理标签页，你还可以在这里顺手记下待办、补一点简短说明、归档完成项，并从顶部图标快速回到当前任务相关的分组。

### 切换主题

想让它更像你自己的工作台时，可以**切换主题、调透明度、换背景图**。

<table>
  <tr>
    <td><img src="assets/readme/theme-warm-neutral.png" alt="warm neutral" width="100%"></td>
    <td><img src="assets/readme/theme-soft-green.png" alt="soft green" width="100%"></td>
  </tr>
  <tr>
    <td><img src="assets/readme/theme-soft-clay.png" alt="soft clay" width="100%"></td>
    <td><img src="assets/readme/theme-custom-background.png" alt="custom background" width="100%"></td>
  </tr>
</table>

## 🌊 为什么它用起来不一样

很多新标签页产品想做的是搜索框、壁纸页，或者更漂亮一点的快捷方式面板。Tab Harbor 更像一个很轻的浏览器控制台。它不会假装你没有开很多标签页，而是承认这种混乱就是现实，然后把它整理成更能工作的样子。

这也是它为什么尽量保持轻。没有后端，没有同步账号，也不需要你再开一个单独应用。所有混乱本来就发生在浏览器里，那它就直接在那里帮你收拾。

## ⚡ 快速使用

### 用 coding agent 安装

1. 把这个仓库地址给你的 coding agent：

   ```text
   https://github.com/V-IOLE-T/tab-harbor
   ```
2. 让它帮你安装扩展
3. 在 Chrome 里打开一个新标签页

### 手动安装

1. 克隆仓库：

   ```bash
   git clone https://github.com/V-IOLE-T/tab-harbor.git
   ```
2. 打开 `chrome://extensions`
3. 开启 **Developer mode**
4. 点击 **Load unpacked**
5. 在 Chrome 里选择 [`extension/`](extension/) 文件夹，Edge 里可直接选仓库根目录
6. 打开一个新标签页

## 🔒 完全本地

Tab Harbor 完全运行在扩展内部。打开中的标签页直接来自 Chrome，保存页、Todos、Quick links、主题偏好和布局状态都留在你自己的机器上，通过 `chrome.storage.local` 保存。

如果你把这个仓库发到 GitHub 给别人用，他们拿到的是代码和资源文件，不会带上你的个人浏览数据。

## 🛠️ 底层

这是一个 Manifest V3 的 Chrome 扩展，前端结构很轻，使用时也不需要 build step。你可以直接 clone、直接加载、直接开始用，不需要 npm，不需要 dev server，也不需要先把别的东西跑起来。

## 🙏 致谢

- Tab Harbor 基于 Zara 的开源项目 [tab-out](https://github.com/zarazhangrui/tab-out) 继续发展，它也是本项目的上游仓库和最初出发点。
- 感谢 [Linux.do 社区](https://linux.do) 提供的灵感、反馈和很有生命力的开源氛围，让这个项目能持续往前长。

## 📄 License

MIT License
