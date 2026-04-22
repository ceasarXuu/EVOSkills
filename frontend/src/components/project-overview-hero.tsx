import { ArrowUpRight, Bot, FolderTree, Waves } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCompactNumber, formatProjectPath, formatRelativeTime } from '@/lib/formatters'
import type { ConnectionState, DashboardProject, ProjectSnapshot } from '@/types/dashboard'

interface ProjectOverviewHeroProps {
  connectionState: ConnectionState
  isLoading: boolean
  lastSyncedAt: string
  project: DashboardProject | null
  snapshot: ProjectSnapshot | null
}

function getConnectionTone(state: ConnectionState) {
  if (state === 'connected') return 'default' as const
  if (state === 'reconnecting') return 'outline' as const
  return 'secondary' as const
}

export function ProjectOverviewHero({
  connectionState,
  isLoading,
  lastSyncedAt,
  project,
  snapshot,
}: ProjectOverviewHeroProps) {
  const agentUsage = snapshot?.agentUsage
  const traceStats = snapshot?.traceStats
  const modelCount = Object.keys(agentUsage?.byModel ?? {}).length

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,rgba(8,14,22,0.92),rgba(14,25,36,0.84))] px-6 py-6 shadow-[0_40px_120px_rgba(5,10,22,0.46)] sm:px-7 sm:py-7">
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1.5fr)_420px]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={getConnectionTone(connectionState)}>
              {connectionState === 'connected' ? 'Live' : connectionState === 'reconnecting' ? 'Retrying' : 'Booting'}
            </Badge>
            <Badge variant="secondary">{project?.monitoringState === 'paused' ? 'Paused' : 'Active'}</Badge>
            <Badge variant="secondary">{isLoading ? 'Loading snapshot' : `同步于 ${formatRelativeTime(lastSyncedAt)}`}</Badge>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-[2.6rem]">
                  {project?.name ?? '等待项目'}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300/72 sm:text-base">
                  {formatProjectPath(project?.path)} · 用独立入口先重建信息层、视觉层和组件层，再从旧 dashboard 分阶段切流。
                </p>
              </div>
              <Button asChild variant="secondary" size="sm">
                <a href="/" rel="noreferrer">
                  Legacy
                  <ArrowUpRight className="size-4" />
                </a>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
              <div className="flex items-center gap-3">
                <FolderTree className="size-4 text-cyan-200" />
                <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Skills</span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-white">
                {formatCompactNumber(snapshot?.skills?.length ?? project?.skillCount ?? 0)}
              </p>
              <p className="mt-2 text-sm text-slate-300/66">Skill Family 和实例视图准备拆分</p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
              <div className="flex items-center gap-3">
                <Waves className="size-4 text-emerald-200" />
                <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Traces</span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-white">
                {formatCompactNumber(traceStats?.total ?? snapshot?.daemon?.processedTraces ?? 0)}
              </p>
              <p className="mt-2 text-sm text-slate-300/66">只显示核心信号，不把排障元数据堆到主屏</p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
              <div className="flex items-center gap-3">
                <Bot className="size-4 text-amber-200" />
                <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Models</span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-white">
                {formatCompactNumber(modelCount)}
              </p>
              <p className="mt-2 text-sm text-slate-300/66">
                {formatCompactNumber(agentUsage?.callCount ?? 0)} calls
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-3xl border border-cyan-300/18 bg-cyan-300/10 p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/70">Isolation</p>
            <p className="mt-4 text-lg font-semibold text-white">frontend/ 子工程 + /v2 独立路由</p>
            <p className="mt-3 text-sm leading-6 text-cyan-50/78">
              新 UI 只共享数据契约，不继承旧 `styles.ts / ui.ts / app-shell.ts` 的样式与拼串结构。
            </p>
          </div>
          <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Shadcn Core</p>
            <p className="mt-4 text-lg font-semibold text-white">React + Tailwind + Radix primitives</p>
            <p className="mt-3 text-sm leading-6 text-slate-300/72">
              当前已经接入 `Button / Badge / Card / Tabs / Table / Dialog`，后续继续补 sheet 与更重的表单控件。
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
