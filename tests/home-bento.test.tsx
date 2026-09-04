import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

test('HomePage uses modular bento components and avoids legacy dashboard presentation', () => {
  const homeContent = readFileSync('src/features/home/home-page.tsx', 'utf8')
  expect(homeContent).toContain('HeroClock')
  expect(homeContent).toContain('OmniSearch')
  expect(homeContent).toContain('QuickLinksBento')
  expect(homeContent).toContain('LiveTabsBento')
  expect(homeContent).toContain('WorkspacesBento')
  expect(homeContent).toContain('DailyTodoBento')
  expect(homeContent).not.toMatch(/components\/dashboard|primary-button|secondary-button/)
})
