import type { WorkspaceView } from './types'

export const navigationItems = [
  { id: 'home', label: '首页', to: '/' },
  { id: 'tabs', label: '标签', to: '/tabs' },
  { id: 'bookmarks', label: '书签', to: '/bookmarks' },
  { id: 'workspaces', label: '工作区', to: '/workspaces' },
] as const satisfies ReadonlyArray<{
  id: WorkspaceView
  label: string
  to: '/' | '/tabs' | '/bookmarks' | '/workspaces'
}>

export type AppPath = (typeof navigationItems)[number]['to']

export function pathForView(view: WorkspaceView): AppPath {
  return navigationItems.find((item) => item.id === view)?.to ?? '/'
}

export function legacyViewPath(view: unknown): Exclude<AppPath, '/'> | undefined {
  if (view === 'tabs') return '/tabs'
  if (view === 'bookmarks') return '/bookmarks'
  if (view === 'workspaces') return '/workspaces'
  return undefined
}
