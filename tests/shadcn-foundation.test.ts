import { expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'

test('configures shadcn with Base UI and generated button primitives', () => {
  const hasConfig = existsSync('components.json')
  const hasButton = existsSync('src/components/ui/button.tsx')

  expect(hasConfig).toBe(true)
  expect(hasButton).toBe(true)
  if (!hasConfig || !hasButton) return

  const config = JSON.parse(readFileSync('components.json', 'utf8')) as {
    style?: string
    rsc?: boolean
    aliases?: { ui?: string }
  }
  const buttonSource = readFileSync('src/components/ui/button.tsx', 'utf8')

  expect(config.style).toBe('base-nova')
  expect(config.rsc).toBe(false)
  expect(config.aliases?.ui).toBe('@/components/ui')
  expect(buttonSource).toContain('@base-ui/react/button')
  expect(buttonSource).not.toMatch(/radix-ui|@radix-ui/)
})
