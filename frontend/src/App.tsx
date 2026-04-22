import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { DashboardViewPanels } from '@/components/dashboard-view-panels'
import { ProjectOverviewHero } from '@/components/project-overview-hero'
import { ProjectSidebar } from '@/components/project-sidebar'
import { SkillDetailDialog } from '@/components/skill-detail-dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDashboardWorkspace } from '@/features/dashboard/use-dashboard-workspace'
import {
  DEFAULT_DASHBOARD_VIEW,
  normalizeDashboardView,
  type DashboardView,
} from '@/features/dashboard/workspace-state'
import { logDashboardUiEvent } from '@/lib/dashboard-client'
import type { DashboardSkill } from '@/types/dashboard'

function App() {
  return (
    <BrowserRouter basename="/v2">
      <Routes>
        <Route path="/" element={<Navigate replace to={`/${DEFAULT_DASHBOARD_VIEW}`} />} />
        <Route path="/:view/*" element={<DashboardWorkspacePage />} />
        <Route path="*" element={<Navigate replace to={`/${DEFAULT_DASHBOARD_VIEW}`} />} />
      </Routes>
    </BrowserRouter>
  )
}

function DashboardWorkspacePage() {
  const navigate = useNavigate()
  const { view } = useParams<{ view?: string }>()
  const currentView = normalizeDashboardView(view)
  const [selectedSkill, setSelectedSkill] = useState<DashboardSkill | null>(null)
  const {
    connectionState,
    isLoadingProjects,
    isLoadingSnapshot,
    lastSyncedAt,
    loadError,
    projects,
    refreshWorkspace,
    selectedProject,
    selectedProjectId,
    selectedSnapshot,
    setSelectedProjectId,
  } = useDashboardWorkspace()

  useEffect(() => {
    if (view !== currentView) {
      navigate(`/${currentView}`, { replace: true })
    }
  }, [currentView, navigate, view])

  useEffect(() => {
    logDashboardUiEvent('workspace.view_changed', { view: currentView })
  }, [currentView])

  useEffect(() => {
    setSelectedSkill(null)
  }, [selectedProjectId])

  const selectedSkillKey = useMemo(() => {
    if (!selectedSkill) {
      return ''
    }

    return `${selectedSkill.skillId}:${selectedSkill.runtime ?? 'unknown'}`
  }, [selectedSkill])

  const handleViewChange = useCallback(
    (nextView: string) => {
      navigate(`/${normalizeDashboardView(nextView)}`)
    },
    [navigate],
  )

  const handleSkillSelect = useCallback(
    (skill: DashboardSkill) => {
      setSelectedSkill(skill)
      logDashboardUiEvent('workspace.skill_dialog_opened', {
        skillId: skill.skillId,
        runtime: skill.runtime ?? 'unknown',
        view: currentView,
      })
    },
    [currentView],
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen max-w-[1800px] grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)]">
        <ProjectSidebar
          connectionState={connectionState}
          isLoading={isLoadingProjects}
          onRefresh={refreshWorkspace}
          onSelect={setSelectedProjectId}
          projects={projects}
          selectedProjectId={selectedProjectId}
        />
        <main className="relative overflow-hidden border-l border-white/6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(65,208,255,0.18),transparent_28%),radial-gradient(circle_at_84%_12%,rgba(233,173,73,0.14),transparent_26%),radial-gradient(circle_at_70%_90%,rgba(97,197,122,0.12),transparent_22%)]" />
          <div className="relative flex min-h-screen flex-col gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
            <Tabs className="gap-6" onValueChange={handleViewChange} value={currentView}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-cyan-200/72">
                    Dashboard V2 Workspace
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    独立前端工作台
                  </h1>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <TabsList className="h-auto flex-wrap rounded-2xl bg-black/20 p-1.5" variant="default">
                    <ViewTrigger value="projects">项目</ViewTrigger>
                    <ViewTrigger value="skills">技能</ViewTrigger>
                    <ViewTrigger value="activity">活动</ViewTrigger>
                  </TabsList>
                  <Button onClick={() => void refreshWorkspace()} size="sm" variant="secondary">
                    <RefreshCw data-icon="inline-start" />
                    刷新
                  </Button>
                </div>
              </div>

              <ProjectOverviewHero
                connectionState={connectionState}
                isLoading={isLoadingSnapshot}
                lastSyncedAt={lastSyncedAt}
                project={selectedProject}
                snapshot={selectedSnapshot}
              />

              {loadError ? (
                <div className="rounded-3xl border border-amber-300/25 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
                  {loadError}
                </div>
              ) : null}

              <DashboardViewPanels
                isLoadingSnapshot={isLoadingSnapshot}
                onSelectSkill={handleSkillSelect}
                selectedSkillKey={selectedSkillKey}
                snapshot={selectedSnapshot}
              />
            </Tabs>
          </div>
        </main>
      </div>

      <SkillDetailDialog
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSkill(null)
          }
        }}
        open={Boolean(selectedSkill)}
        skill={selectedSkill}
      />
    </div>
  )
}

interface ViewTriggerProps {
  children: string
  value: DashboardView
}

function ViewTrigger({ children, value }: ViewTriggerProps) {
  return <TabsTrigger value={value}>{children}</TabsTrigger>
}

export default App
