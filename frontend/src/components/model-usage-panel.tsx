import { Bot, Gauge, Timer } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCompactNumber, formatDuration, formatRelativeTime } from '@/lib/formatters'
import type { DashboardMetricBucket, ProjectSnapshot } from '@/types/dashboard'

interface ModelUsagePanelProps {
  isLoading: boolean
  snapshot: ProjectSnapshot | null
}

function sortModelEntries(entries: Array<[string, DashboardMetricBucket]>) {
  return [...entries].sort((left, right) => {
    return Number(right[1].totalTokens ?? 0) - Number(left[1].totalTokens ?? 0)
  })
}

export function ModelUsagePanel({ isLoading, snapshot }: ModelUsagePanelProps) {
  const modelEntries = sortModelEntries(
    Object.entries(snapshot?.agentUsage?.byModel ?? {}),
  ).slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle>模型负载</CardTitle>
        <CardDescription>先把 usage 看板做成稳定侧栏，再迁成本、配额与策略控制。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <div className="rounded-3xl border border-white/6 bg-black/14 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <Bot className="size-3.5" />
              Calls
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">
              {formatCompactNumber(snapshot?.agentUsage?.callCount ?? 0)}
            </p>
          </div>
          <div className="rounded-3xl border border-white/6 bg-black/14 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <Gauge className="size-3.5" />
              Tokens
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">
              {formatCompactNumber(snapshot?.agentUsage?.totalTokens ?? 0)}
            </p>
          </div>
          <div className="rounded-3xl border border-white/6 bg-black/14 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <Timer className="size-3.5" />
              Avg
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">
              {formatDuration(snapshot?.agentUsage?.avgDurationMs)}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-slate-300/70">正在拉取模型 usage…</div>
        ) : modelEntries.length === 0 ? (
          <div className="text-sm text-slate-300/70">当前项目还没有模型使用记录。</div>
        ) : (
          <div className="space-y-3">
            {modelEntries.map(([modelName, bucket]) => (
              <div
                className="rounded-3xl border border-white/6 bg-white/4 px-4 py-4"
                key={modelName}
              >
                <p className="truncate text-sm font-medium text-white">{modelName}</p>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-300/70">
                  <span>{formatCompactNumber(bucket.callCount ?? 0)} calls</span>
                  <span>{formatCompactNumber(bucket.totalTokens ?? 0)} tokens</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                  <span>{formatDuration(bucket.avgDurationMs)}</span>
                  <span>{formatRelativeTime(bucket.lastCallAt ?? undefined)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
