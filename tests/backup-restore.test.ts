import { beforeEach, expect, test } from 'bun:test'
import {
  clearStorageForTest,
  createTodo,
  createWorkspace,
  exportHarborBackup,
  getPreferences,
  importHarborBackup,
  listQuickLinks,
  listTodos,
  listWorkspaces,
  resetAllData,
  saveQuickLink,
  updatePreferences,
} from '../src/lib/storage'
import type { HarborBackupData } from '../src/lib/types'

beforeEach(() => {
  clearStorageForTest()
})

test('exports comprehensive backup bundle with schema version', async () => {
  await createWorkspace('测试工作区', [
    { id: 1, windowId: 1, index: 0, title: 'GitHub', url: 'https://github.com', active: true, pinned: false, audible: false, discarded: false, groupId: -1, incognito: false },
  ])
  await saveQuickLink({ title: 'Vercel', url: 'https://vercel.com', label: 'VC' })
  await createTodo('完成单测')
  await updatePreferences({ clockFormat: '12h' })

  const backup = await exportHarborBackup()
  expect(backup.version).toBe(1)
  expect(backup.exportedAt).toBeDefined()
  expect(backup.workspaces.length).toBe(1)
  expect(backup.workspaces[0].name).toBe('测试工作区')
  expect(backup.quickLinks.some((l) => l.title === 'Vercel')).toBe(true)
  expect(backup.todos.length).toBe(1)
  expect(backup.preferences.clockFormat).toBe('12h')
})

test('imports backup in replace mode and merge mode', async () => {
  const dummyBackup: HarborBackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    workspaces: [
      { id: 'ws-1', name: '导入的工作区', createdAt: '', updatedAt: '', tabs: [] },
    ],
    quickLinks: [
      { id: 'ql-1', title: 'Google', url: 'https://google.com', label: 'GG' },
    ],
    todos: [
      { id: 'td-1', text: '导入的任务', completed: false, createdAt: '', updatedAt: '' },
    ],
    preferences: {
      defaultSearchEngine: 'google',
      clockFormat: '12h',
      showClockSeconds: false,
      focusMode: true,
    },
  }

  // Replace mode
  const resReplace = await importHarborBackup(dummyBackup, 'replace')
  expect(resReplace.success).toBe(true)
  const workspaces = await listWorkspaces()
  expect(workspaces.length).toBe(1)
  expect(workspaces[0].name).toBe('导入的工作区')

  const prefs = await getPreferences()
  expect(prefs.defaultSearchEngine).toBe('google')
  expect(prefs.focusMode).toBe(true)

  // Merge mode
  await createWorkspace('本地新建工作区', [])
  const resMerge = await importHarborBackup(dummyBackup, 'merge')
  expect(resMerge.success).toBe(true)
  const mergedWorkspaces = await listWorkspaces()
  expect(mergedWorkspaces.length).toBe(2)
})

test('resets all data cleanly to defaults', async () => {
  await createWorkspace('临时工作区', [])
  await resetAllData()
  const workspaces = await listWorkspaces()
  expect(workspaces.length).toBe(0)
  const todos = await listTodos()
  expect(todos.length).toBe(0)
  const prefs = await getPreferences()
  expect(prefs.defaultSearchEngine).toBe('baidu')
})

test('validates backup schema and rejects invalid payload', async () => {
  // @ts-expect-error test invalid payload
  expect(importHarborBackup({ foo: 'bar' }, 'replace')).rejects.toThrow()
})
