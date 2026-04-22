import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatRelativeTime } from '@/lib/formatters'
import type { DashboardSkill, ProjectSnapshot } from '@/types/dashboard'

interface SkillInventoryProps {
  isLoading: boolean
  limit?: number
  onSelectSkill?: (skill: DashboardSkill) => void
  selectedSkillKey?: string
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
      return 'default' as const
    case 'pending':
      return 'outline' as const
    default:
      return 'secondary' as const
  }
}

function getSkillKey(skill: DashboardSkill) {
  return `${skill.skillId}:${skill.runtime ?? 'unknown'}`
}

export function SkillInventory({
  isLoading,
  limit = 12,
  onSelectSkill,
  selectedSkillKey = '',
  snapshot,
}: SkillInventoryProps) {
  const skills = sortSkills(snapshot?.skills ?? []).slice(0, limit)

  return (
    <Card>
      <CardHeader>
        <CardTitle>技能库存</CardTitle>
        <CardDescription>先把 Skill Family 列表、热度排序和只读详情入口做干净。</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        {isLoading ? (
          <div className="px-5 py-10 text-sm text-muted-foreground">正在拉取技能快照...</div>
        ) : skills.length === 0 ? (
          <div className="px-5 py-10 text-sm text-muted-foreground">当前项目还没有可展示的技能。</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 text-[11px] uppercase tracking-[0.24em] text-muted-foreground hover:bg-transparent">
                <TableHead className="px-5 py-3">Skill</TableHead>
                <TableHead className="px-5 py-3">Host</TableHead>
                <TableHead className="px-5 py-3">Status</TableHead>
                <TableHead className="px-5 py-3 text-right">Traces</TableHead>
                <TableHead className="px-5 py-3">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skills.map((skill) => (
                <TableRow
                  className="cursor-pointer border-border/60"
                  data-state={getSkillKey(skill) === selectedSkillKey ? 'selected' : undefined}
                  key={getSkillKey(skill)}
                  onClick={() => onSelectSkill?.(skill)}
                >
                  <TableCell className="px-5 py-4 whitespace-normal">
                    <div>
                      <p className="text-sm font-medium text-foreground">{skill.skillId}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        rev {skill.current_revision ?? '—'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm">{skill.runtime ?? 'unknown'}</TableCell>
                  <TableCell className="px-5 py-4">
                    <Badge variant={getStatusTone(skill.status)}>{skill.status ?? 'unknown'}</Badge>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right text-sm">
                    {skill.traceCount ?? 0}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-muted-foreground">
                    {formatRelativeTime(skill.updatedAt ?? skill.lastUsedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
