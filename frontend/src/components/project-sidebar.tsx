import { Circle, PauseCircle, RefreshCw, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ConnectionState, DashboardProject } from '@/types/dashboard'

interface ProjectSidebarProps {
  connectionState: ConnectionState
  isLoading: boolean
  onRefresh: () => void
  onSelect: (projectId: string) => void
  projects: DashboardProject[]
  selectedProjectId: string
}

function getConnectionCopy(state: ConnectionState) {
  switch (state) {
    case 'connected':
      return { label: 'SSE 已连接', tone: 'success' as const }
    case 'reconnecting':
      return { label: '正在重连', tone: 'warning' as const }
    case 'error':
      return { label: '连接异常', tone: 'warning' as const }
    default:
      return { label: '正在连接', tone: 'neutral' as const }
  }
}

export function ProjectSidebar({
  connectionState,
  isLoading,
  onRefresh,
  onSelect,
  projects,
  selectedProjectId,
}: ProjectSidebarProps) {
  const connection = getConnectionCopy(connectionState)

  return (
    <aside className="relative overflow-hidden border-b border-white/8 bg-[#09101c] xl:border-b-0 xl:border-r xl:border-r-white/8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(55,194,255,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_28%)]" />
      <div className="relative flex h-full flex-col gap-6 px-5 py-6 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/10 text-cyan-100">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">OrnnSkills</p>
                <p className="text-xs text-slate-300/72">独立 v2 入口</p>
              </div>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onRefresh}>
            <RefreshCw className="size-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={connection.tone}>{connection.label}</Badge>
          <Badge>{projects.length} Projects</Badge>
        </div>

        <div className="rounded-3xl border border-white/8 bg-black/16 p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-slate-400">
            Boundary
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-200/78">
            新前端只消费现有 API 与 SSE，不复用旧 HTML 字符串、旧类名或旧样式层。
          </p>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-slate-400">
              Projects
            </p>
            {isLoading ? (
              <span className="text-xs text-slate-500">loading</span>
            ) : null}
          </div>

          <div className="space-y-3 overflow-y-auto pr-1">
            {projects.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-300/70">
                还没有已注册项目。
              </div>
            ) : null}
            {projects.map((project) => {
              const isActive = project.path === selectedProjectId
              const isPaused = project.monitoringState === 'paused' || project.isPaused

              return (
                <button
                  className={cn(
                    'w-full rounded-3xl border px-4 py-4 text-left transition duration-200',
                    isActive
                      ? 'border-cyan-300/26 bg-cyan-300/12 shadow-[0_18px_42px_rgba(59,196,255,0.16)]'
                      : 'border-white/8 bg-white/4 hover:border-white/16 hover:bg-white/8',
                  )}
                  key={project.path}
                  onClick={() => onSelect(project.path)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{project.name}</p>
                      <p className="mt-1 truncate text-xs text-slate-300/60">{project.path}</p>
                    </div>
                    {isPaused ? (
                      <PauseCircle className="mt-0.5 size-4 shrink-0 text-amber-200" />
                    ) : (
                      <Circle
                        className={cn(
                          'mt-0.5 size-4 shrink-0',
                          project.isRunning ? 'fill-emerald-300 text-emerald-300' : 'text-slate-600',
                        )}
                      />
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-300/70">
                    <span>{project.skillCount ?? 0} skills</span>
                    <span>{isPaused ? 'Paused' : project.isRunning ? 'Running' : 'Idle'}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </aside>
  )
}
