import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatRelativeTime } from '@/lib/formatters'
import type { DashboardSkill, ProjectSnapshot } from '@/types/dashboard'

interface SkillInventoryProps {
  isLoading: boolean
  snapshot: ProjectSnapshot | null
}

function sortSkills(skills: DashboardSkill[]) {
  return [...skills].sort((left, right) => {
    const rightScore = Number(right.traceCount ?? 0)
    const leftScore = Number(left.traceCount ?? 0)
    if (rightScore !== leftScore) {
      return rightScore - leftScore
    }

    return String(right.updatedAt ?? '').localeCompare(String(left.updatedAt ?? ''))
  })
}

function getStatusTone(status: string | undefined) {
  switch (status) {
    case 'optimized':
    case 'active':
      return 'success' as const
    case 'pending':
      return 'warning' as const
    default:
      return 'neutral' as const
  }
}

export function SkillInventory({ isLoading, snapshot }: SkillInventoryProps) {
  const skills = sortSkills(snapshot?.skills ?? []).slice(0, 8)

  return (
    <Card>
      <CardHeader>
        <CardTitle>技能库存</CardTitle>
        <CardDescription>独立视图先把 Skill Family 的主列表和热度排序做干净。</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        {isLoading ? (
          <div className="px-5 py-10 text-sm text-slate-300/70">正在拉取技能快照…</div>
        ) : skills.length === 0 ? (
          <div className="px-5 py-10 text-sm text-slate-300/70">当前项目还没有可展示的技能。</div>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b border-white/6 text-[11px] uppercase tracking-[0.24em] text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Skill</th>
                <th className="px-5 py-3 font-medium">Host</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Traces</th>
                <th className="px-5 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((skill) => (
                <tr className="border-b border-white/6 last:border-b-0" key={`${skill.skillId}-${skill.runtime}`}>
                  <td className="px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-white">{skill.skillId}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        rev {skill.current_revision ?? '—'}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-300/72">{skill.runtime ?? 'unknown'}</td>
                  <td className="px-5 py-4">
                    <Badge tone={getStatusTone(skill.status)}>{skill.status ?? 'unknown'}</Badge>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-200">{skill.traceCount ?? 0}</td>
                  <td className="px-5 py-4 text-sm text-slate-300/72">
                    {formatRelativeTime(skill.updatedAt ?? skill.lastUsedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}
