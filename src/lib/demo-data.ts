import type { BrowserTab, QuickLink } from './types'

export const quickLinks: QuickLink[] = [
  { id: 'github', title: 'GitHub', url: 'https://github.com', label: 'GH' },
  { id: 'chatgpt', title: 'ChatGPT', url: 'https://chatgpt.com', label: 'AI' },
  { id: 'google', title: 'Google', url: 'https://google.com', label: 'G' },
  { id: 'zhihu', title: '知乎', url: 'https://www.zhihu.com', label: '知' },
  { id: 'bilibili', title: '哔哩哔哩', url: 'https://www.bilibili.com', label: 'B' },
]

const demoRows = [
  ['Calcium-Ion', 'https://github.com/xu756/Calcium-Ion', 'GitHub'],
  ['tab-harbor', 'https://github.com/xu756/tab-harbor', 'GitHub'],
  ['TanStack Start', 'https://tanstack.com/start/latest', 'Docs'],
  ['5173 Admin', 'http://localhost:5173', 'Localhost'],
  ['3000 go-flow', 'http://localhost:3000', 'Localhost'],
  ['Grafana', 'http://localhost:3001', 'Localhost'],
  ['百度翻译', 'https://fanyi.baidu.com', 'Baidu'],
  ['Shadcn Theme Generator', 'https://tweakcn.com', 'Design'],
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
