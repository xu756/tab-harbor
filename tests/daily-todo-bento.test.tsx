import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { DailyTodoBento } from '../src/features/home/components/daily-todo-bento'
import type { TodoItem } from '../src/lib/types'

const mockTodos: TodoItem[] = [
  { id: '1', text: '完成 Bento 页面开发', completed: true, createdAt: Date.now() },
  { id: '2', text: '运行单元测试', completed: false, createdAt: Date.now() },
]

test('renders DailyTodoBento with progress and task items', () => {
  const html = renderToStaticMarkup(
    <DailyTodoBento
      todos={mockTodos}
      onCreate={() => undefined}
      onToggle={() => undefined}
      onRemove={() => undefined}
      onClearCompleted={() => undefined}
    />,
  )

  expect(html).toContain('今日待办')
  expect(html).toContain('1 / 2 已完成')
  expect(html).toContain('完成 Bento 页面开发')
  expect(html).toContain('运行单元测试')
  expect(html).toContain('清理已完成')
})
