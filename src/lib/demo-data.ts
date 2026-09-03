import type { BrowserBookmark, BrowserTab, QuickLink } from './types'
import type { BookmarkNodeInput } from './bookmark-catalog'

export const defaultQuickLinks: QuickLink[] = [
  { id: 'github', title: 'GitHub', url: 'https://github.com', label: 'GH' },
  { id: 'chatgpt', title: 'ChatGPT', url: 'https://chatgpt.com', label: 'AI' },
  { id: 'google', title: 'Google', url: 'https://google.com', label: 'G' },
  { id: 'zhihu', title: '知乎', url: 'https://www.zhihu.com', label: '知' },
  { id: 'bilibili', title: '哔哩哔哩', url: 'https://www.bilibili.com', label: 'B' },
]

const demoRows = [
  ['Calcium-Ion', 'https://github.com/xu756/Calcium-Ion', 'GitHub'],
  ['tab-harbor', 'https://github.com/xu756/tab-harbor', 'GitHub'],
  ['TanStack Router', 'https://tanstack.com/router/latest', 'Docs'],
  ['5173 Admin', 'http://localhost:5173', 'Localhost'],
  ['3000 go-flow', 'http://localhost:3000', 'Localhost'],
  ['Grafana', 'http://localhost:3001', 'Localhost'],
  ['百度翻译', 'https://fanyi.baidu.com', 'Baidu'],
  ['shadcn/ui', 'https://ui.shadcn.com', 'Design'],
  ['Deployments', 'https://vercel.com/dashboard', 'Deploy'],
  ['ChatGPT', 'https://chatgpt.com', 'AI'],
  ['Claude', 'https://claude.ai', 'AI'],
  ['Google Scholar', 'https://scholar.google.com', 'Research'],
  ['arXiv', 'https://arxiv.org', 'Research'],
  ['MDN Web Docs', 'https://developer.mozilla.org', 'Docs'],
  ['Chrome Extensions', 'https://developer.chrome.com/docs/extensions', 'Docs'],
] as const

export const demoTabs: BrowserTab[] = demoRows.map(([title, url, groupTitle], index) => ({
  id: index + 1,
  windowId: 1,
  index,
  title,
  url,
  active: index === 0,
  pinned: index < 2,
  audible: false,
  discarded: false,
  groupId: groupTitle === 'Localhost' ? 2 : groupTitle === 'GitHub' ? 1 : -1,
  groupTitle,
  groupColor: groupTitle === 'GitHub' ? 'blue' : groupTitle === 'Localhost' ? 'green' : undefined,
  incognito: false,
}))

export const demoBookmarks: BrowserBookmark[] = [
  { id: 'b1', title: 'TanStack Router', url: 'https://tanstack.com/router/latest', parentId: 'demo-folder-dev', index: 0, folderPath: '书签栏 / 开发', dateAdded: Date.now() - 60_000, unmodifiable: false },
  { id: 'b2', title: 'Chrome Extensions', url: 'https://developer.chrome.com/docs/extensions', parentId: 'demo-folder-dev', index: 1, folderPath: '书签栏 / 开发', dateAdded: Date.now() - 120_000, unmodifiable: false },
  { id: 'b3', title: 'shadcn/ui', url: 'https://ui.shadcn.com', parentId: 'demo-folder-design', index: 0, folderPath: '书签栏 / 设计', dateAdded: Date.now() - 180_000, unmodifiable: false },
  { id: 'b4', title: 'arXiv', url: 'https://arxiv.org', parentId: 'demo-folder-research', index: 0, folderPath: '书签栏 / 研究', dateAdded: Date.now() - 240_000, unmodifiable: false },
  { id: 'b5', title: 'Google Scholar', url: 'https://scholar.google.com', parentId: 'demo-folder-research', index: 1, folderPath: '书签栏 / 研究', dateAdded: Date.now() - 300_000, unmodifiable: false },
]

export const demoBookmarkTree: BookmarkNodeInput[] = [
  {
    id: '0',
    title: '',
    children: [
      {
        id: '1',
        title: '书签栏',
        index: 0,
        folderType: 'bookmarks-bar',
        children: [
          {
            id: 'demo-folder-dev',
            parentId: '1',
            title: '开发',
            index: 0,
            children: demoBookmarks
              .filter((bookmark) => bookmark.parentId === 'demo-folder-dev')
              .map((bookmark) => ({ ...bookmark })),
          },
          {
            id: 'demo-folder-design',
            parentId: '1',
            title: '设计',
            index: 1,
            children: demoBookmarks
              .filter((bookmark) => bookmark.parentId === 'demo-folder-design')
              .map((bookmark) => ({ ...bookmark })),
          },
          {
            id: 'demo-folder-research',
            parentId: '1',
            title: '研究',
            index: 2,
            children: demoBookmarks
              .filter((bookmark) => bookmark.parentId === 'demo-folder-research')
              .map((bookmark) => ({ ...bookmark })),
          },
          {
            id: 'demo-folder-empty',
            parentId: '1',
            title: '稍后整理',
            index: 3,
            children: [],
          },
        ],
      },
      {
        id: '2',
        title: '其他书签',
        index: 1,
        folderType: 'other',
        children: [],
      },
    ],
  },
]
