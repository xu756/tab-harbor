import { expect, test } from 'bun:test'
import {
  DEFAULT_SEARCH_ENGINE_ID,
  SEARCH_ENGINES,
  resolveSearchOrUrl,
} from '../src/lib/search-engines'

test('defines supported search engines with valid URL templates', () => {
  expect(DEFAULT_SEARCH_ENGINE_ID).toBe('google')
  expect(SEARCH_ENGINES.google.urlTemplate).toContain('https://www.google.com/search?q=')
  expect(SEARCH_ENGINES.baidu.urlTemplate).toContain('https://www.baidu.com/s?wd=')
  expect(SEARCH_ENGINES.bing.urlTemplate).toContain('https://www.bing.com/search?q=')
  expect(SEARCH_ENGINES.duckduckgo.urlTemplate).toContain('https://duckduckgo.com/?q=')
  expect(SEARCH_ENGINES.github.urlTemplate).toContain('https://github.com/search?q=')
})

test('resolves direct URLs starting with http or https', () => {
  expect(resolveSearchOrUrl('https://example.com')).toBe('https://example.com')
  expect(resolveSearchOrUrl('http://localhost:3000')).toBe('http://localhost:3000')
})

test('resolves direct URLs with domain-like formatting', () => {
  expect(resolveSearchOrUrl('github.com/user/repo')).toBe('https://github.com/user/repo')
  expect(resolveSearchOrUrl('localhost:5173')).toBe('http://localhost:5173')
})

test('formats search query using specified or default search engine', () => {
  expect(resolveSearchOrUrl('shadcn ui')).toBe('https://www.google.com/search?q=shadcn%20ui')
  expect(resolveSearchOrUrl('react 19', 'github')).toBe('https://github.com/search?q=react%2019')
  expect(resolveSearchOrUrl('vite build', 'baidu')).toBe('https://www.baidu.com/s?wd=vite%20build')
  expect(resolveSearchOrUrl('bun test', 'bing')).toBe('https://www.bing.com/search?q=bun%20test')
  expect(resolveSearchOrUrl('antigravity', 'duckduckgo')).toBe('https://duckduckgo.com/?q=antigravity')
})
