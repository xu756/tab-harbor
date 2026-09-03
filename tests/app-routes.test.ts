import { expect, test } from 'bun:test'

import { legacyViewPath, navigationItems } from '../src/lib/app-routes'

test('maps every workspace area to a stable route', () => {
  expect(navigationItems.map(({ id, to }) => [id, to])).toEqual([
    ['home', '/'],
    ['tabs', '/tabs'],
    ['bookmarks', '/bookmarks'],
    ['workspaces', '/workspaces'],
  ])
})

test('redirects legacy view search values and ignores unknown values', () => {
  expect(legacyViewPath('tabs')).toBe('/tabs')
  expect(legacyViewPath('bookmarks')).toBe('/bookmarks')
  expect(legacyViewPath('workspaces')).toBe('/workspaces')
  expect(legacyViewPath('home')).toBeUndefined()
  expect(legacyViewPath('settings')).toBeUndefined()
})
