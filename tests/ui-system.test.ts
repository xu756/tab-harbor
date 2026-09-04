import { expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(path, 'utf8')

test('uses route pages and has no legacy dashboard presentation layer', () => {
  expect(existsSync('src/components/dashboard.tsx')).toBe(false)

  const sources = [
    'src/routes/index.tsx',
    'src/routes/tabs.tsx',
    'src/routes/bookmarks.tsx',
    'src/routes/workspaces.tsx',
    'src/features/app/app-shell.tsx',
    'src/features/home/home-page.tsx',
    'src/features/tabs/tabs-page.tsx',
    'src/features/bookmarks/bookmarks-page.tsx',
    'src/features/workspaces/workspaces-page.tsx',
    'src/components/bookmark-organizer.tsx',
    'src/styles/app.css',
  ].map(read).join('\n')

  expect(sources).not.toMatch(/components\/dashboard|primary-button|secondary-button|dialog-card|menu-popover|search-field/)
  expect(sources).not.toMatch(/radix-ui|@radix-ui|\basChild\b|IconPlaceholder/)
  expect(sources).not.toMatch(/text-\[(?:[0-9]|1[01])px\]/)
  expect(read('src/styles/app.css')).toContain('font-size: 16px')
})
