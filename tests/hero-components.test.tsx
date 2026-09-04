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

test('renders HeroClock with 12-hour format and hidden seconds', () => {
  const html = renderToStaticMarkup(
    <HeroClock
      fixedDate={new Date('2026-09-04T15:45:30')}
      clockFormat="12h"
      showSeconds={false}
    />,
  )
  expect(html).toContain('03')
  expect(html).toContain('45')
  expect(html).toContain('PM')
  expect(html).not.toContain(':30')
})

test('renders OmniSearch with custom default engine', () => {
  const html = renderToStaticMarkup(<OmniSearch defaultEngine="baidu" />)
  expect(html).toContain('百度')
})

