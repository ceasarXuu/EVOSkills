import { ActivityStream } from '@/components/activity-stream'
import { InsightStack } from '@/components/insight-stack'
import { ProjectStatusPanel } from '@/components/project-status-panel'
import { SkillsTable } from '@/components/skills-table'
import type { DashboardProject, DashboardSkill, ProjectSnapshot } from '@/types/dashboard'

interface ProjectWorkbenchProps {
  isLoading: boolean
  onQueryChange: (value: string) => void
  onSelectSkill: (skill: DashboardSkill) => void
  project: DashboardProject | null
  query: string
  selectedSkillKey: string
  skills: DashboardSkill[]
  snapshot: ProjectSnapshot | null
}

export function ProjectWorkbench({
  isLoading,
  onQueryChange,
  onSelectSkill,
  project,
  query,
  selectedSkillKey,
  skills,
  snapshot,
}: ProjectWorkbenchProps) {
  return (
    <div className="space-y-6">
      <ProjectStatusPanel project={project} snapshot={snapshot} />

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <SkillsTable
          isLoading={isLoading}
          onQueryChange={onQueryChange}
          onSelectSkill={onSelectSkill}
          query={query}
          selectedSkillKey={selectedSkillKey}
          skills={skills}
        />
        <InsightStack snapshot={snapshot} />
      </div>

      <ActivityStream isLoading={isLoading} snapshot={snapshot} />
    </div>
  )
}
