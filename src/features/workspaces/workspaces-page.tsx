import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, FolderOpen, Layers3, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useApp, workspacesQueryKey } from '@/features/app/app-provider'
import { PageHeading } from '@/features/shared/page-heading'
import { SiteIcon } from '@/features/shared/site-icon'
import { hostnameFromUrl, restoreUrls } from '@/lib/chrome'
import { removeWorkspace } from '@/lib/storage'
import type { Workspace } from '@/lib/types'

export function WorkspacesPage() {
  const queryClient = useQueryClient()
  const { tabs, workspaces, openSaveWorkspace, openRenameWorkspace } = useApp()
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null)
  const removeMutation = useMutation({
    mutationFn: removeWorkspace,
    onSuccess: async () => {
      setDeleteTarget(null)
      await queryClient.invalidateQueries({ queryKey: workspacesQueryKey })
    },
  })

  return (
    <section className="space-y-7 px-5 py-8 sm:px-7 sm:py-10">
      <PageHeading
        eyebrow="Workspaces"
        title="工作区"
        description="把一组临时标签保存成可以随时恢复的上下文。"
        action={<Button size="lg" onClick={() => openSaveWorkspace(tabs)} disabled={!tabs.length}><FolderOpen data-icon="inline-start" />保存当前标签</Button>}
      />

      {!workspaces.length ? (
        <Card>
          <Empty className="min-h-80 border-0">
            <EmptyHeader><EmptyMedia variant="icon"><Layers3 /></EmptyMedia><EmptyTitle className="text-base">从正在做的事情开始</EmptyTitle><EmptyDescription>把当前标签保存成第一个工作区，以后可以一键恢复。</EmptyDescription></EmptyHeader>
            <EmptyContent><Button onClick={() => openSaveWorkspace(tabs)} disabled={!tabs.length}>创建工作区</Button></EmptyContent>
          </Empty>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((workspace) => (
            <Card key={workspace.id} className="gap-4 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><CardTitle className="truncate text-lg">{workspace.name}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{workspace.tabs.length} tabs · {relativeTime(workspace.updatedAt)}</p></div>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`${workspace.name} 更多操作`} />}><MoreHorizontal /></DropdownMenuTrigger>
                    <DropdownMenuContent align="end"><DropdownMenuGroup><DropdownMenuItem onClick={() => openRenameWorkspace(workspace)}><Pencil />重命名</DropdownMenuItem><DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(workspace)}><Trash2 />删除</DropdownMenuItem></DropdownMenuGroup></DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex -space-x-1.5">{workspace.tabs.slice(0, 7).map((tab) => <SiteIcon key={tab.id} title={tab.title} url={tab.url} src={tab.favIconUrl} />)}{workspace.tabs.length > 7 ? <span className="grid size-6 place-items-center rounded-md bg-muted text-[0.65rem] text-muted-foreground ring-2 ring-card">+{workspace.tabs.length - 7}</span> : null}</div>
                <p className="mt-4 truncate text-xs text-muted-foreground">{uniqueHosts(workspace).slice(0, 4).join(' · ')}</p>
              </CardContent>
              <CardFooter className="justify-end">
                <Button variant="ghost" size="sm" onClick={() => void restoreUrls(workspace.tabs.map((tab) => tab.url))}>打开<ExternalLink data-icon="inline-end" /></Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia><Trash2 /></AlertDialogMedia>
            <AlertDialogTitle>删除“{deleteTarget?.name}”？</AlertDialogTitle>
            <AlertDialogDescription>这只会删除保存的工作区，不会关闭或删除浏览器标签。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => deleteTarget && removeMutation.mutate(deleteTarget.id)}>删除</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

function uniqueHosts(workspace: Workspace) {
  return [...new Set(workspace.tabs.map((tab) => hostnameFromUrl(tab.url)))]
}

function relativeTime(value: string) {
  const delta = Date.now() - new Date(value).getTime()
  const minutes = Math.max(1, Math.floor(delta / 60_000))
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}
