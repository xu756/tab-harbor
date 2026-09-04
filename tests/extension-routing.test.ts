import { expect, test } from 'bun:test'

import * as routerModule from '../src/router'

function createExtensionWindow() {
  let state: Record<string, unknown> = {}

  return {
    location: {
      pathname: '/index.html',
      search: '',
      hash: '',
    },
    history: {
      get state() {
        return state
      },
      length: 1,
      pushState(nextState: Record<string, unknown>) {
        state = nextState
      },
      replaceState(nextState: Record<string, unknown>) {
        state = nextState
      },
      back() {},
      forward() {},
      go() {},
    },
    addEventListener() {},
    removeEventListener() {},
  }
}

test('treats the extension document as the application root', () => {
  expect('createAppHistory' in routerModule).toBe(true)

  const createAppHistory = (
    routerModule as typeof routerModule & {
      createAppHistory: (browserWindow: unknown) => {
        location: { pathname: string }
        destroy: () => void
      }
    }
  ).createAppHistory
  const history = createAppHistory(createExtensionWindow())

  expect(history.location.pathname).toBe('/')
  history.destroy()
})

test('puts the side-panel search state inside the SPA hash route', async () => {
  const manifest = await Bun.file(
    new URL('../public/manifest.json', import.meta.url),
  ).json()

  expect(manifest.side_panel.default_path).toBe(
    'index.html#/?surface=sidepanel',
  )
})
