import { Activity02Icon, FolderLibraryIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  formatCompactNumber,
  formatRelativeTime,
  getMonitoringBadgeVariant,
} from '@/lib/format'
import type { DashboardProject } from '@/types/dashboard'

interface ProjectRailProps {
  isLoading: boolean
  onSelect: (projectPath: string) => void
  projects: DashboardProject[]
  selectedProjectId: string
}

export function ProjectRail({
  isLoading,
  onSelect,
  projects,
  selectedProjectId,
}: ProjectRailProps) {
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
      <div className="px-1">
        <p className="text-sm font-medium">项目范围</p>
        <p className="text-sm text-muted-foreground">切换当前工作上下文。</p>
      </div>
      <div className="space-y-3">
        {isLoading && projects.length === 0 ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="border-border/70">
              <CardHeader>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </CardHeader>
              <CardContent className="flex gap-2">
                <Skeleton className="h-5 w-18 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          projects.map((project) => {
            const isActive = project.path === selectedProjectId
            return (
              <button
                key={project.path}
                className="block w-full text-left"
                onClick={() => onSelect(project.path)}
                type="button"
              >
                <Card
                  className={cn(
                    'border-border/70 transition-colors hover:border-primary/40 hover:bg-muted/50',
                    isActive && 'border-primary/45 bg-primary/8',
                  )}
                  size="sm"
                >
                  <CardHeader className="gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{project.name}</CardTitle>
                        <CardDescription className="truncate">{project.path}</CardDescription>
                      </div>
                      <Badge variant={getMonitoringBadgeVariant(project.monitoringState)}>
                        {project.monitoringState === 'paused' ? 'Paused' : 'Active'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      <HugeiconsIcon icon={FolderLibraryIcon} size={12} strokeWidth={2} />
                      {formatCompactNumber(project.skillCount)} skills
                    </Badge>
                    <Badge variant="outline">
                      <HugeiconsIcon icon={Activity02Icon} size={12} strokeWidth={2} />
                      {formatRelativeTime(project.lastSeenAt)}
                    </Badge>
                  </CardContent>
                </Card>
              </button>
            )
          })
        )}
      </div>
    </aside>
  )
}
