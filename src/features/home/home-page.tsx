import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useApp, quickLinksQueryKey, todosQueryKey } from '@/features/app/app-provider'
import { DailyTodoBento } from '@/features/home/components/daily-todo-bento'
import { HeroClock } from '@/features/home/components/hero-clock'
import { LiveTabsBento } from '@/features/home/components/live-tabs-bento'
import { OmniSearch } from '@/features/home/components/omni-search'
import { QuickLinksBento } from '@/features/home/components/quick-links-bento'
import { WorkspacesBento } from '@/features/home/components/workspaces-bento'
import {
  clearCompletedTodos,
  createTodo,
  removeQuickLink,
  removeTodo,
  updateTodo,
} from '@/lib/storage'

export function HomePage() {
  const {
    tabs,
    workspaces,
    quickLinks,
    todos,
    loadingTabs,
    openSaveWorkspace,
    openQuickLinkEditor,
  } = useApp()

  const queryClient = useQueryClient()

  const removeQuickLinkMutation = useMutation({
    mutationFn: removeQuickLink,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quickLinksQueryKey }),
  })

  const createTodoMutation = useMutation({
    mutationFn: createTodo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todosQueryKey }),
  })

  const updateTodoMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { completed: boolean } }) =>
      updateTodo(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todosQueryKey }),
  })

  const removeTodoMutation = useMutation({
    mutationFn: removeTodo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todosQueryKey }),
  })

  const clearCompletedTodosMutation = useMutation({
    mutationFn: clearCompletedTodos,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todosQueryKey }),
  })

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 space-y-8 sm:space-y-10 animate-in fade-in duration-300">
      <HeroClock />

      <OmniSearch />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        <QuickLinksBento
          links={quickLinks}
          onEdit={openQuickLinkEditor}
          onRemove={(id) => removeQuickLinkMutation.mutate(id)}
        />

        <LiveTabsBento
          tabs={tabs}
          loading={loadingTabs}
          onSaveWorkspace={() => openSaveWorkspace(tabs)}
        />

        <WorkspacesBento workspaces={workspaces} />

        <DailyTodoBento
          todos={todos}
          onCreate={(text) => createTodoMutation.mutate(text)}
          onToggle={(id, completed) => updateTodoMutation.mutate({ id, patch: { completed } })}
          onRemove={(id) => removeTodoMutation.mutate(id)}
          onClearCompleted={() => clearCompletedTodosMutation.mutate()}
        />
      </div>
    </div>
  )
}
