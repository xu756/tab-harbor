import {
  AlertTriangle,
  Check,
  CircleUserRound,
  Cloud,
  Database,
  Download,
  Loader2,
  LogOut,
  RefreshCw,
  Sliders,
  Sparkles,
  Upload,
} from 'lucide-react'
import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useApp } from '@/features/app/app-provider'
import { SEARCH_ENGINES, type SearchEngineId } from '@/lib/search-engines'
import type {
  ClockFormat,
  HarborBackupData,
  MockUserSession,
  UserPreferences,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { setSettingsOpen, useUiStore } from '@/state/ui-store'

export type SettingsTab = 'preferences' | 'account' | 'backup'

export interface SettingsDialogViewProps {
  open: boolean
  activeTab?: SettingsTab
  onOpenChange: (open: boolean) => void
  preferences: UserPreferences
  session: MockUserSession
  onUpdatePreferences: (patch: Partial<UserPreferences>) => Promise<UserPreferences>
  onLogin: (email: string, name?: string) => Promise<MockUserSession>
  onLogout: () => Promise<MockUserSession>
  onSync: () => Promise<{ success: boolean; syncedAt: string }>
  onExportBackup: () => Promise<HarborBackupData>
  onImportBackup: (
    data: HarborBackupData,
    mode: 'merge' | 'replace',
  ) => Promise<{ success: boolean; workspacesCount: number; quickLinksCount: number; todosCount: number }>
  onResetData: () => Promise<void>
}

export interface SettingsDialogContentProps
  extends Omit<SettingsDialogViewProps, 'open' | 'onOpenChange'> {}

export function SettingsDialogContent({
  activeTab: controlledTab,
  preferences,
  session,
  onUpdatePreferences,
  onLogin,
  onLogout,
  onSync,
  onExportBackup,
  onImportBackup,
  onResetData,
}: SettingsDialogContentProps) {
  const [internalTab, setInternalTab] = useState<SettingsTab>('preferences')
  const currentTab = controlledTab ?? internalTab


  // Login form state
  const [emailInput, setEmailInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null)

  // Backup state
  const [backupNotice, setBackupNotice] = useState<string | null>(null)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDemoLogin = async () => {
    setIsLoggingIn(true)
    try {
      await onLogin('demo@tabharbor.dev', 'Harbor 探索者')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailInput.trim()) return
    setIsLoggingIn(true)
    try {
      await onLogin(emailInput.trim(), nameInput.trim() || undefined)
      setEmailInput('')
      setNameInput('')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleSyncClick = async () => {
    setIsSyncing(true)
    setSyncFeedback(null)
    try {
      const res = await onSync()
      if (res.success) {
        setSyncFeedback('云端数据同步完成！')
        setTimeout(() => setSyncFeedback(null), 3000)
      }
    } finally {
      setIsSyncing(false)
    }
  }

  const handleExport = async () => {
    try {
      const data = await onExportBackup()
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tab-harbor-backup-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      setBackupNotice('备份文件已成功生成并下载！')
      setTimeout(() => setBackupNotice(null), 3000)
    } catch {
      setBackupError('导出备份时发生错误。')
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setBackupError(null)
    setBackupNotice(null)

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const result = await onImportBackup(parsed, 'merge')
      setBackupNotice(
        `成功导入并合并 ${result.workspacesCount} 个工作区、${result.quickLinksCount} 个快捷入口！`,
      )
      setTimeout(() => setBackupNotice(null), 4000)
    } catch (err: any) {
      setBackupError(err?.message || '导入文件解析失败，请检查文件格式。')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col max-h-[85vh] overflow-y-auto">
      <div className="p-5 border-b pb-4">
        <h2 className="text-base font-semibold tracking-tight text-foreground">设置与偏好</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          管理搜索偏好、外观显示、云端同步以及数据备份。
        </p>


          <div className="flex items-center gap-1.5 pt-3">
            <button
              type="button"
              onClick={() => setInternalTab('preferences')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                currentTab === 'preferences'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
              )}
            >
              <Sliders className="size-3.5" />
              <span>偏好设置</span>
            </button>

            <button
              type="button"
              onClick={() => setInternalTab('account')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                currentTab === 'account'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
              )}
            >
              <Cloud className="size-3.5" />
              <span>账户与同步</span>
            </button>

            <button
              type="button"
              onClick={() => setInternalTab('backup')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                currentTab === 'backup'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
              )}
            >
              <Database className="size-3.5" />
              <span>数据备份</span>
            </button>
          </div>
      </div>


        <div className="p-5 space-y-6 text-sm">
          {/* TAB 1: PREFERENCES */}
          {currentTab === 'preferences' && (
            <div className="space-y-5">
              <section className="space-y-2.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  默认搜索引擎
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.values(SEARCH_ENGINES).map((engine) => {
                    const isSelected = preferences.defaultSearchEngine === engine.id
                    return (
                      <button
                        key={engine.id}
                        type="button"
                        onClick={() => onUpdatePreferences({ defaultSearchEngine: engine.id })}
                        className={cn(
                          'flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-medium transition-all text-left',
                          isSelected
                            ? 'border-primary bg-primary/5 text-primary shadow-xs font-semibold'
                            : 'border-border/70 hover:border-border hover:bg-muted/40 text-foreground',
                        )}
                      >
                        <span>{engine.name}</span>
                        {isSelected && <Check className="size-3.5 text-primary" />}
                      </button>
                    )
                  })}
                </div>
              </section>

              <div className="h-px bg-border/60" />

              <section className="space-y-3">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  时钟与时间格式
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex rounded-xl border border-border/70 p-0.5 bg-muted/30">
                    <button
                      type="button"
                      onClick={() => onUpdatePreferences({ clockFormat: '24h' })}
                      className={cn(
                        'px-3 py-1 rounded-lg text-xs font-medium transition-all',
                        preferences.clockFormat === '24h'
                          ? 'bg-background text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      24 小时制
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdatePreferences({ clockFormat: '12h' })}
                      className={cn(
                        'px-3 py-1 rounded-lg text-xs font-medium transition-all',
                        preferences.clockFormat === '12h'
                          ? 'bg-background text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      12 小时制
                    </button>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground select-none">
                    <Checkbox
                      checked={preferences.showClockSeconds}
                      onCheckedChange={(checked) =>
                        onUpdatePreferences({ showClockSeconds: Boolean(checked) })
                      }
                    />
                    <span>显示秒数</span>
                  </label>
                </div>
              </section>

              <div className="h-px bg-border/60" />

              <section className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  专注模式
                </label>
                <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 p-3 bg-muted/20">
                  <div className="space-y-0.5">
                    <strong className="text-xs font-medium text-foreground">
                      首页专注极简模式
                    </strong>
                    <p className="text-xs text-muted-foreground">
                      开启后默认折叠首页 Bento 组件，仅保留居中时钟与搜索框，让工作台彻底归于沉浸与清爽。
                    </p>
                  </div>
                  <Checkbox
                    checked={preferences.focusMode}
                    onCheckedChange={(checked) =>
                      onUpdatePreferences({ focusMode: Boolean(checked) })
                    }
                    aria-label="切换专注模式"
                  />
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: ACCOUNT & SYNC */}
          {currentTab === 'account' && (
            <div className="space-y-5">
              {!session.isLoggedIn ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                      <CircleUserRound className="size-4 text-primary" />
                      <span>本地模式运行中</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Tab Harbor 遵循本地优先原则。无需注册账号，所有工作区、待办清单和书签整理均安全存放在本机。
                    </p>
                  </div>

                  <div className="rounded-2xl border border-primary/20 bg-primary/[0.02] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cloud className="size-4 text-primary" />
                        <strong className="text-xs font-semibold text-foreground">
                          多设备云同步（演示预览）
                        </strong>
                      </div>
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[0.68rem] text-primary font-medium">
                        即将支持
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      接入后端后，您将可以使用账号跨浏览器、跨设备无缝同步工作区与快捷方式，并享有端到端加密保护。
                    </p>

                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleDemoLogin}
                        disabled={isLoggingIn}
                        className="w-full sm:w-auto h-8 text-xs gap-1.5"
                      >
                        {isLoggingIn ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                        <span>体验模拟登录</span>
                      </Button>
                    </div>
                  </div>

                  <form onSubmit={handleCustomLogin} className="space-y-3 pt-2">
                    <label className="text-xs font-semibold text-foreground">
                      或输入邮箱模拟登录
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        type="email"
                        placeholder="邮箱 (如 user@domain.com)"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Input
                        placeholder="显示名称 (可选)"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={isLoggingIn || !emailInput.trim()}
                      className="h-8 text-xs"
                    >
                      登录并激活模拟同步
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-primary text-primary-foreground font-semibold text-sm grid place-items-center">
                        {session.user?.name?.slice(0, 2).toUpperCase() || 'HB'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-semibold text-foreground">
                            {session.user?.name}
                          </strong>
                          <span className="rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 text-[0.68rem] font-medium uppercase">
                            {session.user?.plan || 'Free'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => onLogout()}
                      className="h-7 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="size-3.5 mr-1" />
                      <span>退出登录</span>
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-border/70 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cloud className="size-4 text-emerald-500" />
                        <strong className="text-xs font-semibold text-foreground">云端同步状态</strong>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {session.lastSyncedAt
                          ? `上次同步：${new Date(session.lastSyncedAt).toLocaleTimeString()}`
                          : '尚未同步'}
                      </span>
                    </div>

                    {syncFeedback && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {syncFeedback}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSyncClick}
                        disabled={isSyncing}
                        className="h-8 text-xs gap-1.5"
                      >
                        {isSyncing ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="size-3.5" />
                        )}
                        <span>立即同步</span>
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        当前数据与本地工作区自动保持一致
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BACKUP & RESTORE */}
          {currentTab === 'backup' && (
            <div className="space-y-5">
              {backupNotice && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {backupNotice}
                </div>
              )}
              {backupError && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
                  {backupError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border/70 bg-card p-4 flex flex-col justify-between gap-3">
                  <div className="space-y-1">
                    <strong className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Download className="size-4 text-primary" />
                      <span>导出数据备份</span>
                    </strong>
                    <p className="text-xs text-muted-foreground">
                      将工作区、快捷入口、待办清单及设置偏好导出为一个 JSON 备份文件。
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="w-full h-8 text-xs gap-1.5"
                  >
                    <Download className="size-3.5" />
                    <span>导出 JSON 备份</span>
                  </Button>
                </div>

                <div className="rounded-2xl border border-border/70 bg-card p-4 flex flex-col justify-between gap-3">
                  <div className="space-y-1">
                    <strong className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Upload className="size-4 text-primary" />
                      <span>恢复与导入</span>
                    </strong>
                    <p className="text-xs text-muted-foreground">
                      从本地 JSON 备份文件恢复数据，并与当前工作区自动合并。
                    </p>
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileChange}
                      className="hidden"
                      id="harbor-backup-file-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-8 text-xs gap-1.5"
                    >
                      <Upload className="size-3.5" />
                      <span>选择备份文件导入</span>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="h-px bg-border/60" />

              <div className="rounded-2xl border border-destructive/30 bg-destructive/[0.02] p-4 space-y-3">
                <div className="flex items-center gap-2 text-destructive font-semibold text-xs">
                  <AlertTriangle className="size-4" />
                  <span>危险操作区</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  重置所有工作区、快捷入口、待办及偏好设置为默认值。此操作不可逆。
                </p>

                {!confirmReset ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmReset(true)}
                    className="h-8 text-xs text-destructive hover:bg-destructive/10"
                  >
                    重置所有数据
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        await onResetData()
                        setConfirmReset(false)
                        setBackupNotice('所有数据已成功重置为默认值！')
                        setTimeout(() => setBackupNotice(null), 3000)
                      }}
                      className="h-8 text-xs"
                    >
                      确认清空重置
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmReset(false)}
                      className="h-8 text-xs"
                    >
                      取消
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
    </div>
  )
}


export function SettingsDialogView({
  open,
  onOpenChange,
  ...contentProps
}: SettingsDialogViewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <SettingsDialogContent {...contentProps} />
      </DialogContent>
    </Dialog>
  )
}


export function SettingsDialog() {
  const settingsOpen = useUiStore((state) => state.settingsOpen)
  const {
    preferences,
    session,
    updatePreferences,
    login,
    logout,
    triggerSync,
    exportBackup,
    importBackup,
    resetData,
  } = useApp()

  return (
    <SettingsDialogView
      open={settingsOpen}
      onOpenChange={setSettingsOpen}
      preferences={preferences}
      session={session}
      onUpdatePreferences={updatePreferences}
      onLogin={login}
      onLogout={logout}
      onSync={triggerSync}
      onExportBackup={exportBackup}
      onImportBackup={importBackup}
      onResetData={resetData}
    />
  )
}
