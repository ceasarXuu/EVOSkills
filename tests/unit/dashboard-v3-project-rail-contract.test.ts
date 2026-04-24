import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const projectRailSource = readFileSync(
  new URL('../../frontend-v3/src/components/project-rail.tsx', import.meta.url),
  'utf8',
)
const dashboardApiSource = readFileSync(
  new URL('../../frontend-v3/src/lib/dashboard-api.ts', import.meta.url),
  'utf8',
)
const workspaceHookSource = readFileSync(
  new URL('../../frontend-v3/src/features/dashboard/use-dashboard-v3-workspace.ts', import.meta.url),
  'utf8',
)
const appSource = readFileSync(
  new URL('../../frontend-v3/src/App.tsx', import.meta.url),
  'utf8',
)

describe('dashboard v3 project rail contract', () => {
  it('uses the same shell form as the skills library list', () => {
    expect(projectRailSource).toContain('aside className="sticky top-24 self-start"')
    expect(projectRailSource).toContain('Card className="h-[calc(100vh-7rem)] border-border/70 bg-card/92"')
    expect(projectRailSource).toContain("CardHeader className=\"gap-4 border-b border-border/70\"")
    expect(projectRailSource).toContain('<CardTitle className="text-xl">{t(\'projects\')}</CardTitle>')
    expect(projectRailSource).toContain('formatCompactNumberForLocale(projects.length, locale)')
    expect(projectRailSource).toContain('placeholder={t(\'searchProjects\')}')
    expect(projectRailSource).toContain('CardContent className="min-h-0 flex-1 px-0"')
    expect(projectRailSource).toContain('ScrollArea className="h-full"')
    expect(projectRailSource).toContain('className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${')
    expect(appSource).toContain('grid min-w-[1540px] grid-cols-[340px_minmax(0,1fr)] items-start gap-6')
  })

  it('does not render each project row as a nested Card anymore', () => {
    expect(projectRailSource).not.toContain('<Card\n')
    expect(projectRailSource).not.toContain('<CardDescription')
    expect(projectRailSource).not.toContain('size="sm"')
  })

  it('exposes the native project picker entry through the project rail', () => {
    expect(projectRailSource).toContain('onPickProject: () => void')
    expect(projectRailSource).toContain('aria-label={t(\'addProject\')}')
    expect(projectRailSource).toContain('onClick={onPickProject}')
    expect(projectRailSource).toContain('disabled={isPicking}')
    expect(dashboardApiSource).toContain("postJson<DashboardProjectPickResponse>('/api/projects/pick', {})")
    expect(workspaceHookSource).toContain("logDashboardV3Event('project.pick_started')")
    expect(workspaceHookSource).toContain('pickDashboardProject()')
  })
})
