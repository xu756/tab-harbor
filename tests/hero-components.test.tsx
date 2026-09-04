import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { HeroClock } from '../src/features/home/components/hero-clock'
import { OmniSearch } from '../src/features/home/components/omni-search'

test('renders HeroClock with localized date and time display', () => {
  const html = renderToStaticMarkup(<HeroClock fixedDate={new Date('2026-09-04T10:30:00')} />)
  expect(html).toContain('10')
  expect(html).toContain('30')
  expect(html).toContain('早上好')
  expect(html).toContain('9月4日')
})

test('renders OmniSearch with search input and engine selection', () => {
  const html = renderToStaticMarkup(<OmniSearch />)
  expect(html).toContain('placeholder="搜索网页或输入网址…"')
  expect(html).toContain('Google')
})
