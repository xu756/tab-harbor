import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SlidersHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useApp, quickLinksQueryKey, todosQueryKey } from '@/features/app/app-provider'
import { DailyTodoBento } from '@/features/home/components/daily-todo-bento'
import { HeroClock } from '@/features/home/components/hero-clock'
import { LiveTabsBento } from '@/features/home/components/live-tabs-bento'
import { OmniSearch } from '@/features/home/components/omni-search'
import { QuickLinksBento } from '@/features/home/components/quick-links-bento'
import { WorkspacesBento } from '@/features/home/components/workspaces-bento'
import type { SearchEngineId } from '@/lib/search-engines'
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
    preferences,
    loadingTabs,
    openSaveWorkspace,
    openQuickLinkEditor,
    updatePreferences,
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
      <HeroClock
        clockFormat={preferences.clockFormat}
        showSeconds={preferences.showClockSeconds}
      />

      <OmniSearch
        defaultEngine={preferences.defaultSearchEngine as SearchEngineId}
        onEngineChange={(engine) => void updatePreferences({ defaultSearchEngine: engine })}
      />

      {preferences.focusMode ? (
        <div className="pt-4 flex justify-center animate-in fade-in duration-300">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void updatePreferences({ focusMode: false })}
            className="h-8 gap-1.5 px-3 text-xs text-muted-foreground hover:text-foreground rounded-xl"
          >
            <SlidersHorizontal className="size-3.5" />
            <span>极简专注模式已开启 · 点击恢复全部组件</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 animate-in fade-in duration-200">
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
      )}
    </div>
  )
}

