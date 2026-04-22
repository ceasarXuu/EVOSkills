import { FolderLibraryIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCompactNumber } from '@/lib/format'
import type { DashboardProject } from '@/types/dashboard'

interface ProjectScopeBarProps {
  onSelect: (projectPath: string) => void
  projects: DashboardProject[]
  selectedProjectId: string
}

export function ProjectScopeBar({
  onSelect,
  projects,
  selectedProjectId,
}: ProjectScopeBarProps) {
  return (
    <Card className="border-border/70">
      <CardHeader className="gap-2">
        <CardTitle>项目范围</CardTitle>
        <CardDescription>技能视角只把项目当作过滤范围，不再把项目摘要放在首屏主位。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {projects.map((project) => {
            const isActive = project.path === selectedProjectId
            return (
              <Button
                className="h-auto min-w-[200px] items-start justify-between px-4 py-3"
                key={project.path}
                onClick={() => onSelect(project.path)}
                size="sm"
                variant={isActive ? 'default' : 'outline'}
              >
                <span className="min-w-0 text-left">
                  <span className="block truncate text-sm font-medium">{project.name}</span>
                  <span className="mt-1 flex items-center gap-2 text-xs opacity-80">
                    <HugeiconsIcon icon={FolderLibraryIcon} size={12} strokeWidth={2} />
                    {formatCompactNumber(project.skillCount)} skills
                  </span>
                </span>
                <Badge variant={isActive ? 'secondary' : 'outline'}>
                  {project.monitoringState === 'paused' ? 'Paused' : 'Active'}
                </Badge>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
