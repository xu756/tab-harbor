import { expect, test } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { SettingsDialogContent } from '../src/features/settings/settings-dialog'

test('renders SettingsDialogContent with tabs and preferences controls', () => {
  const html = renderToString(
    <SettingsDialogContent
      preferences={{

        defaultSearchEngine: 'baidu',
        clockFormat: '24h',
        showClockSeconds: true,
        focusMode: false,
      }}
      session={{
        isLoggedIn: false,
        autoSyncEnabled: false,
      }}
      onUpdatePreferences={() => Promise.resolve({ defaultSearchEngine: 'baidu', clockFormat: '24h', showClockSeconds: true, focusMode: false })}
      onLogin={() => Promise.resolve({ isLoggedIn: true, autoSyncEnabled: true })}
      onLogout={() => Promise.resolve({ isLoggedIn: false, autoSyncEnabled: false })}
      onSync={() => Promise.resolve({ success: true, syncedAt: '' })}
      onExportBackup={() => Promise.resolve({} as any)}
      onImportBackup={() => Promise.resolve({ success: true, workspacesCount: 0, quickLinksCount: 0, todosCount: 0 })}
      onResetData={() => Promise.resolve()}
    />
  )

  expect(html).toContain('设置与偏好')
  expect(html).toContain('偏好设置')
  expect(html).toContain('账户与同步')
  expect(html).toContain('数据备份')
  expect(html).toContain('默认搜索引擎')
  expect(html).toContain('专注模式')
  expect(html).toContain('24 小时制')
})

test('renders local mode session state in SettingsDialogContent', () => {
  const html = renderToString(
    <SettingsDialogContent
      activeTab="account"
      preferences={{
        defaultSearchEngine: 'baidu',
        clockFormat: '24h',
        showClockSeconds: true,
        focusMode: false,
      }}
      session={{
        isLoggedIn: false,
        autoSyncEnabled: false,
      }}
      onUpdatePreferences={() => Promise.resolve({ defaultSearchEngine: 'baidu', clockFormat: '24h', showClockSeconds: true, focusMode: false })}
      onLogin={() => Promise.resolve({ isLoggedIn: true, autoSyncEnabled: true })}
      onLogout={() => Promise.resolve({ isLoggedIn: false, autoSyncEnabled: false })}
      onSync={() => Promise.resolve({ success: true, syncedAt: '' })}
      onExportBackup={() => Promise.resolve({} as any)}
      onImportBackup={() => Promise.resolve({ success: true, workspacesCount: 0, quickLinksCount: 0, todosCount: 0 })}
      onResetData={() => Promise.resolve()}
    />
  )

  expect(html).toContain('本地模式运行中')
  expect(html).toContain('多设备云同步')
  expect(html).toContain('体验模拟登录')
})

test('renders logged in session state in SettingsDialogContent', () => {

  const html = renderToString(
    <SettingsDialogContent
      activeTab="account"
      preferences={{

        defaultSearchEngine: 'google',
        clockFormat: '12h',
        showClockSeconds: false,
        focusMode: true,
      }}
      session={{
        isLoggedIn: true,
        user: {
          id: 'user-1',
          email: 'demo@tabharbor.dev',
          name: 'Demo Explorer',
          plan: 'pro',
          joinedAt: '2026-01-01T00:00:00.000Z',
        },
        autoSyncEnabled: true,
        lastSyncedAt: '2026-09-04T12:00:00.000Z',
      }}
      onUpdatePreferences={() => Promise.resolve({ defaultSearchEngine: 'google', clockFormat: '12h', showClockSeconds: false, focusMode: true })}
      onLogin={() => Promise.resolve({ isLoggedIn: true, autoSyncEnabled: true })}
      onLogout={() => Promise.resolve({ isLoggedIn: false, autoSyncEnabled: false })}
      onSync={() => Promise.resolve({ success: true, syncedAt: '' })}
      onExportBackup={() => Promise.resolve({} as any)}
      onImportBackup={() => Promise.resolve({ success: true, workspacesCount: 0, quickLinksCount: 0, todosCount: 0 })}
      onResetData={() => Promise.resolve()}
    />
  )

  expect(html).toContain('demo@tabharbor.dev')
  expect(html).toContain('Demo Explorer')
  expect(html).toContain('立即同步')
  expect(html).toContain('退出登录')
})
