import { FolderAddIcon, Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCompactNumberForLocale, formatRelativeTime, getMonitoringBadgeVariant } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { filterProjects } from '@/lib/project-rail'
import type { DashboardProject } from '@/types/dashboard'

interface ProjectRailProps {
  isLoading: boolean
  isPicking: boolean
  onPickProject: () => void
  onSelect: (projectPath: string) => void
  projects: DashboardProject[]
  selectedProjectId: string
}

export function ProjectRail({
  isLoading,
  isPicking,
  onPickProject,
  onSelect,
  projects,
  selectedProjectId,
}: ProjectRailProps) {
  const { locale, t } = useI18n()
  const [query, setQuery] = useState('')
  const filteredProjects = useMemo(() => filterProjects(projects, query), [projects, query])

  return (
    <aside className="sticky top-24 self-start">
      <Card className="h-[calc(100vh-7rem)] border-border/70 bg-card/92">
        <CardHeader className="gap-4 border-b border-border/70">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-xl">{t('projects')}</CardTitle>
              <div className="text-sm text-muted-foreground">
                {formatCompactNumberForLocale(projects.length, locale)} {t('projectCount')}
              </div>
            </div>

            <Button
              aria-label={t('addProject')}
              className="size-9 shrink-0 rounded-xl"
              disabled={isPicking}
              onClick={onPickProject}
              title={t('addProject')}
              type="button"
              variant="outline"
            >
              <HugeiconsIcon icon={FolderAddIcon} size={17} strokeWidth={1.8} />
            </Button>
          </div>

          <label className="relative block">
            <HugeiconsIcon
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              icon={Search01Icon}
              size={16}
              strokeWidth={1.8}
            />
            <Input
              className="h-10 rounded-xl border-border/80 bg-background/60 pl-10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchProjects')}
              value={query}
            />
          </label>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 px-0">
          {isLoading && projects.length === 0 ? (
            <div className="space-y-3 px-6 py-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton className="h-24 w-full rounded-xl" key={index} />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">
              {t('noProjects')}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">
              {t('noMatchedProjects')}
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-2 px-4 py-4">
                {filteredProjects.map((project) => {
                  const isActive = project.path === selectedProjectId
                  return (
                    <button
                      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                        isActive
                          ? 'border-primary/50 bg-primary/8'
                          : 'border-border/70 bg-background/30 hover:border-primary/30 hover:bg-muted/40'
                      }`}
                      key={project.path}
                      onClick={() => onSelect(project.path)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="truncate font-medium">{project.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{project.path}</div>
                        </div>
                        <Badge variant={getMonitoringBadgeVariant(project.monitoringState)}>
                          {project.monitoringState === 'paused' ? 'Paused' : 'Active'}
                        </Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{formatCompactNumberForLocale(project.skillCount, locale)} {t('skills')}</span>
                        <span>{formatRelativeTime(project.lastSeenAt, locale, t('invalidDate'))}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </aside>
  )
}
