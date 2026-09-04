import { expect, test } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { AccountBadge } from '../src/features/app/app-shell'

test('renders AccountBadge in local mode with settings indicator', () => {
  const html = renderToString(
    <AccountBadge
      session={{ isLoggedIn: false, autoSyncEnabled: false }}
      onClick={() => {}}
    />,
  )
  expect(html).toContain('本地')
  expect(html).toContain('button')
})

test('renders AccountBadge in logged in mode with user name and sync indicator', () => {
  const html = renderToString(
    <AccountBadge
      session={{
        isLoggedIn: true,
        user: {
          id: 'user-1',
          email: 'alex@example.com',
          name: 'Alex',
          plan: 'pro',
          joinedAt: '2026-01-01T00:00:00.000Z',
        },
        autoSyncEnabled: true,
      }}
      onClick={() => {}}
    />,
  )
  expect(html).toContain('Alex')
})
