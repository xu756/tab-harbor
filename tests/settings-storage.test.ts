import { beforeEach, expect, test } from 'bun:test'
import {
  clearStorageForTest,
  getPreferences,
  getSession,
  mockLogin,
  mockLogout,
  mockTriggerSync,
  updatePreferences,
} from '../src/lib/storage'

beforeEach(() => {
  clearStorageForTest()
})


test('returns default user preferences', async () => {
  const prefs = await getPreferences()
  expect(prefs.defaultSearchEngine).toBe('baidu')
  expect(prefs.clockFormat).toBe('24h')
  expect(prefs.showClockSeconds).toBe(true)
  expect(prefs.focusMode).toBe(false)
})

test('updates and persists user preferences partially', async () => {
  const updated = await updatePreferences({ clockFormat: '12h', focusMode: true })
  expect(updated.clockFormat).toBe('12h')
  expect(updated.focusMode).toBe(true)
  expect(updated.defaultSearchEngine).toBe('baidu')

  const reloaded = await getPreferences()
  expect(reloaded.clockFormat).toBe('12h')
  expect(reloaded.focusMode).toBe(true)
})

test('handles mock session login, sync, and logout', async () => {
  const initialSession = await getSession()
  expect(initialSession.isLoggedIn).toBe(false)

  const loggedIn = await mockLogin('test@tabharbor.dev', 'Tester')
  expect(loggedIn.isLoggedIn).toBe(true)
  expect(loggedIn.user?.email).toBe('test@tabharbor.dev')
  expect(loggedIn.user?.name).toBe('Tester')

  const syncResult = await mockTriggerSync()
  expect(syncResult.success).toBe(true)
  expect(syncResult.syncedAt).toBeDefined()

  const afterSync = await getSession()
  expect(afterSync.lastSyncedAt).toBe(syncResult.syncedAt)

  const loggedOut = await mockLogout()
  expect(loggedOut.isLoggedIn).toBe(false)
  expect(loggedOut.user).toBeUndefined()
})
