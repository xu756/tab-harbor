import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ChevronRight,
  ExternalLink,
  Globe2,
  Layers3,
  ListTodo,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group'
import { useApp, quickLinksQueryKey, todosQueryKey } from '@/features/app/app-provider'
import { SiteIcon } from '@/features/shared/site-icon'
import { LiveTabs } from '@/features/tabs/live-tabs'
import { openUrl, openUrlInNewTab, restoreUrls } from '@/lib/chrome'
import { clearCompletedTodos, createTodo, removeQuickLink, removeTodo, updateTodo } from '@/lib/storage'
import type { QuickLink, TodoItem } from '@/lib/types'
import { cn } from '@/lib/utils'

export function HomePage() {
  const { tabs, workspaces, quickLinks, todos, loadingTabs, openSaveWorkspace, openQuickLinkEditor } = useApp()
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 6 ? '夜深了' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
  const date = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(now)

  return (
    <div className="grid gap-6 px-5 py-7 sm:px-7 lg:grid-cols-[minmax(0,1fr)_23rem] lg:py-9">
      <div className="min-w-0 space-y-6">
        <section className="flex flex-col gap-3 py-2 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-medium text-muted-foreground">{date}</p><h1 className="mt-1 font-heading text-4xl font-semibold tracking-tight">{greeting}。</h1></div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="size-4" />把今天要用的页面留在眼前。</p>
        </section>
        <LiveTabs tabs={tabs} loading={loadingTabs} onSave={openSaveWorkspace} compact />
      </div>
      <aside className="min-w-0 space-y-4">
        <WebSearch />
        <QuickLinks links={quickLinks} onEdit={openQuickLinkEditor} />
        <TodoList todos={todos} />
        <RecentWorkspaces workspaces={workspaces} />
      </aside>
    </div>
  )
}

function WebSearch() {
  const [query, setQuery] = useState('')
  const submit = () => {
    const value = query.trim()
    if (!value) return
    const looksLikeUrl = /^(https?:\/\/|localhost[:/]|[\w-]+\.[a-z]{2,})/i.test(value)
    void openUrl(looksLikeUrl ? (value.startsWith('http') ? value : `https://${value}`) : `https://www.google.com/search?q=${encodeURIComponent(value)}`)
  }
  return (
    <form onSubmit={(event) => { event.preventDefault(); submit() }}>
      <InputGroup className="h-11 bg-card shadow-sm">
        <InputGroupAddon><Search /></InputGroupAddon>
        <InputGroupInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索网页或输入网址" />
        <InputGroupAddon align="inline-end"><InputGroupText className="text-xs">Google</InputGroupText></InputGroupAddon>
      </InputGroup>
    </form>
  )
}

function SectionTitle({ icon: Icon, title, action }: { icon: typeof Globe2; title: string; action?: React.ReactNode }) {
  return <CardHeader className="flex flex-row items-center justify-between border-b py-3"><CardTitle className="flex items-center gap-2 text-sm"><Icon className="size-4 text-muted-foreground" />{title}</CardTitle>{action}</CardHeader>
}

function QuickLinks({ links, onEdit }: { links: QuickLink[]; onEdit: (link?: QuickLink) => void }) {
  const queryClient = useQueryClient()
  const removeMutation = useMutation({ mutationFn: removeQuickLink, onSuccess: () => queryClient.invalidateQueries({ queryKey: quickLinksQueryKey }) })
  return (
    <Card className="gap-0 py-0">
      <SectionTitle icon={Globe2} title="快捷入口" action={<Button variant="ghost" size="icon-sm" onClick={() => onEdit()} aria-label="添加快捷入口"><Plus /></Button>} />
      <CardContent className="grid grid-cols-2 gap-1 p-2">
        {links.map((link) => (
          <div key={link.id} className="group flex min-w-0 items-center rounded-lg transition-colors hover:bg-muted">
            <Button variant="ghost" className="min-w-0 flex-1 justify-start px-2 hover:bg-transparent" onClick={() => void openUrl(link.url)}>
              <SiteIcon title={link.title} url={link.url} fallback={link.label} /><span className="truncate">{link.title}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" className="mr-1" aria-label={`${link.title} 更多操作`} />}><MoreHorizontal /></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => onEdit(link)}><Pencil />编辑</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void openUrlInNewTab(link.url)}><ExternalLink />新标签打开</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => removeMutation.mutate(link.id)}><Trash2 />删除</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        <Button variant="ghost" className="justify-start text-muted-foreground" onClick={() => onEdit()}><Plus data-icon="inline-start" />添加</Button>
      </CardContent>
    </Card>
  )
}

function TodoList({ todos }: { todos: TodoItem[] }) {
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const createMutation = useMutation({ mutationFn: createTodo, onSuccess: async () => { setText(''); await queryClient.invalidateQueries({ queryKey: todosQueryKey }) } })
  const updateMutation = useMutation({ mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<TodoItem, 'text' | 'completed'>> }) => updateTodo(id, patch), onSuccess: () => queryClient.invalidateQueries({ queryKey: todosQueryKey }) })
  const removeMutation = useMutation({ mutationFn: removeTodo, onSuccess: () => queryClient.invalidateQueries({ queryKey: todosQueryKey }) })
  const clearMutation = useMutation({ mutationFn: clearCompletedTodos, onSuccess: () => queryClient.invalidateQueries({ queryKey: todosQueryKey }) })
  const completed = todos.filter((todo) => todo.completed).length
  return (
    <Card className="gap-0 py-0">
      <SectionTitle icon={ListTodo} title="待办" action={completed ? <Button variant="ghost" size="sm" onClick={() => clearMutation.mutate()}>清理已完成</Button> : undefined} />
      <CardContent className="p-2">
        <form className="mb-1 flex gap-1" onSubmit={(event) => { event.preventDefault(); if (text.trim()) createMutation.mutate(text) }}>
          <Input value={text} onChange={(event) => setText(event.target.value)} placeholder="添加一件小事…" />
          <Button type="submit" size="icon" variant="secondary" aria-label="添加待办"><Plus /></Button>
        </form>
        <div>
          {!todos.length ? <p className="px-2 py-5 text-center text-sm text-muted-foreground">今天还没有待办。</p> : todos.slice(0, 7).map((todo) => (
            <TodoRow key={todo.id} todo={todo} onToggle={() => updateMutation.mutate({ id: todo.id, patch: { completed: !todo.completed } })} onEdit={(value) => updateMutation.mutate({ id: todo.id, patch: { text: value } })} onRemove={() => removeMutation.mutate(todo.id)} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function TodoRow({ todo, onToggle, onEdit, onRemove }: { todo: TodoItem; onToggle: () => void; onEdit: (text: string) => void; onRemove: () => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(todo.text)
  const save = () => { if (value.trim() && value.trim() !== todo.text) onEdit(value); setEditing(false) }
  return (
    <div className="group flex min-h-9 items-center gap-2 rounded-lg px-2 hover:bg-muted/70">
      <Checkbox checked={todo.completed} onCheckedChange={onToggle} aria-label={todo.completed ? '标记未完成' : '标记完成'} />
      {editing
        ? <Input autoFocus className="h-7 border-0 px-1 shadow-none" value={value} onChange={(event) => setValue(event.target.value)} onBlur={save} onKeyDown={(event) => { if (event.key === 'Enter') save(); if (event.key === 'Escape') { setValue(todo.text); setEditing(false) } }} />
        : <span className={cn('min-w-0 flex-1 truncate text-sm', todo.completed && 'text-muted-foreground line-through')}>{todo.text}</span>}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label="更多操作" />}><MoreHorizontal /></DropdownMenuTrigger>
        <DropdownMenuContent align="end"><DropdownMenuGroup><DropdownMenuItem onClick={() => setEditing(true)}><Pencil />编辑</DropdownMenuItem><DropdownMenuItem variant="destructive" onClick={onRemove}><Trash2 />删除</DropdownMenuItem></DropdownMenuGroup></DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function RecentWorkspaces({ workspaces }: { workspaces: ReturnType<typeof useApp>['workspaces'] }) {
  return (
    <Card className="gap-0 py-0">
      <SectionTitle icon={Layers3} title="最近工作区" action={<Link to="/workspaces" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>全部</Link>} />
      <CardContent className="p-2">
        {!workspaces.length ? <p className="px-2 py-5 text-center text-sm text-muted-foreground">保存一组标签后，它会出现在这里。</p> : workspaces.slice(0, 4).map((workspace) => (
          <Button key={workspace.id} variant="ghost" className="h-auto w-full justify-start gap-3 px-2 py-2.5" onClick={() => void restoreUrls(workspace.tabs.map((tab) => tab.url))}>
            <span className="grid size-8 place-items-center rounded-lg bg-muted"><Layers3 /></span>
            <span className="min-w-0 flex-1 text-left"><strong className="block truncate text-sm">{workspace.name}</strong><span className="block text-xs font-normal text-muted-foreground">{workspace.tabs.length} tabs</span></span><ChevronRight className="text-muted-foreground" />
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
