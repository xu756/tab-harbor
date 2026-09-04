import { CheckCircle2, ListTodo, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import type { TodoItem } from '@/lib/types'
import { cn } from '@/lib/utils'

interface DailyTodoBentoProps {
  todos: TodoItem[]
  onCreate: (text: string) => void
  onToggle: (id: string, completed: boolean) => void
  onRemove: (id: string) => void
  onClearCompleted: () => void
}

export function DailyTodoBento({
  todos,
  onCreate,
  onToggle,
  onRemove,
  onClearCompleted,
}: DailyTodoBentoProps) {
  const [inputText, setInputText] = useState('')

  const completedCount = todos.filter((t) => t.completed).length

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputText.trim()
    if (!trimmed) return
    onCreate(trimmed)
    setInputText('')
  }

  return (
    <Card className="rounded-2xl border-border/60 bg-card/75 backdrop-blur-md shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/25 flex flex-col justify-between">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 px-5 py-3.5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ListTodo className="size-4 text-primary/80" />
          <span>今日待办</span>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground font-normal">
            {completedCount} / {todos.length} 已完成
          </span>
        </CardTitle>

        {completedCount > 0 && (
          <Button
            variant="ghost"
            size="xs"
            onClick={onClearCompleted}
            className="h-6 text-xs text-muted-foreground hover:text-foreground"
          >
            <span>清理已完成</span>
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-3 flex-1 flex flex-col justify-between gap-3">
        <form onSubmit={handleSubmit} className="flex gap-1.5">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="添加一件专注小事…"
            className="h-8 text-xs rounded-xl bg-background/50 border-border/50"
          />
          <Button
            type="submit"
            size="icon-xs"
            variant="secondary"
            className="size-8 rounded-xl shrink-0"
            aria-label="添加待办"
          >
            <Plus className="size-3.5" />
          </Button>
        </form>

        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {!todos.length ? (
            <div className="py-5 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5">
              <CheckCircle2 className="size-5 text-muted-foreground/40" />
              <span>今日还没有待办，随手记一件吧</span>
            </div>
          ) : (
            todos.slice(0, 6).map((todo) => (
              <div
                key={todo.id}
                className="group flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted/60"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => onToggle(todo.id, !todo.completed)}
                    aria-label={todo.completed ? '标记未完成' : '标记完成'}
                  />
                  <span
                    className={cn(
                      'text-xs truncate transition-all',
                      todo.completed ? 'text-muted-foreground/70 line-through' : 'text-foreground',
                    )}
                  >
                    {todo.text}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onRemove(todo.id)}
                  className="size-5 rounded-md grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted hover:text-destructive"
                  aria-label="删除待办"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border/40 pt-2 text-[0.68rem] text-muted-foreground text-center">
          随时记下今日专注，完成打勾心无旁骛
        </div>
      </CardContent>
    </Card>
  )
}
