import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { ActivityFeed } from '@/components/activity-feed'
import { ModelUsagePanel } from '@/components/model-usage-panel'
import { ProjectOverviewHero } from '@/components/project-overview-hero'
import { ProjectSidebar } from '@/components/project-sidebar'
import { SkillInventory } from '@/components/skill-inventory'
import { Button } from '@/components/ui/button'
import {
  connectDashboardEvents,
  fetchDashboardProjects,
  fetchProjectSnapshot,
  installDashboardErrorReporting,
} from '@/lib/dashboard-client'
import type {
  ConnectionState,
  DashboardProject,
  DashboardSsePayload,
  ProjectSnapshot,
} from '@/types/dashboard'

function pickNextProject(
  projects: DashboardProject[],
  currentProjectId: string,
): string {
  if (projects.length === 0) {
    return ''
  }

  if (currentProjectId && projects.some((project) => project.path === currentProjectId)) {
    return currentProjectId
  }

  const preferredProject = projects.find((project) => project.monitoringState !== 'paused')
  return preferredProject?.path ?? projects[0]?.path ?? ''
}

function App() {
  const [projects, setProjects] = useState<DashboardProject[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [snapshotMap, setSnapshotMap] = useState<Record<string, ProjectSnapshot>>({})
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false)
  const [loadError, setLoadError] = useState<string>('')
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('')

  const selectedProject = useMemo(
    () => projects.find((project) => project.path === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )

  const selectedSnapshot = useMemo(
    () => (selectedProjectId ? snapshotMap[selectedProjectId] ?? null : null),
    [selectedProjectId, snapshotMap],
  )

  const loadProjects = useCallback(async () => {
    setIsLoadingProjects(true)
    setLoadError('')
    try {
      const nextProjects = await fetchDashboardProjects()
      setProjects(nextProjects)
      setSelectedProjectId((currentProjectId) => pickNextProject(nextProjects, currentProjectId))
      setLastSyncedAt(new Date().toISOString())
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoadingProjects(false)
    }
  }, [])

  const loadSnapshot = useCallback(async (projectId: string, force = false) => {
    if (!projectId) {
      return
    }

    if (!force && snapshotMap[projectId]) {
      return
    }

    setIsLoadingSnapshot(true)
    setLoadError('')
    try {
      const snapshot = await fetchProjectSnapshot(projectId)
      setSnapshotMap((current) => ({
        ...current,
        [projectId]: snapshot,
      }))
      setLastSyncedAt(new Date().toISOString())
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoadingSnapshot(false)
    }
  }, [snapshotMap])

  const handleRefresh = useCallback(async () => {
    await loadProjects()
    if (selectedProjectId) {
      await loadSnapshot(selectedProjectId, true)
    }
  }, [loadProjects, loadSnapshot, selectedProjectId])

  useEffect(() => {
    installDashboardErrorReporting()
    void loadProjects()
  }, [loadProjects])

  useEffect(() => {
    if (!selectedProjectId) {
      return
    }

    void loadSnapshot(selectedProjectId)
  }, [loadSnapshot, selectedProjectId])

  useEffect(() => {
    const dispose = connectDashboardEvents(
      async (payload: DashboardSsePayload) => {
        if (Array.isArray(payload.projects)) {
          setProjects(payload.projects)
          setSelectedProjectId((currentProjectId) =>
            pickNextProject(payload.projects ?? [], currentProjectId),
          )
        }

        if (
          selectedProjectId &&
          Array.isArray(payload.changedProjects) &&
          payload.changedProjects.includes(selectedProjectId)
        ) {
          await loadSnapshot(selectedProjectId, true)
        }
      },
      setConnectionState,
    )

    return dispose
  }, [loadSnapshot, selectedProjectId])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen max-w-[1800px] grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)]">
        <ProjectSidebar
          connectionState={connectionState}
          isLoading={isLoadingProjects}
          onRefresh={handleRefresh}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelect={setSelectedProjectId}
        />
        <main className="relative overflow-hidden border-l border-white/6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(65,208,255,0.18),transparent_28%),radial-gradient(circle_at_84%_12%,rgba(233,173,73,0.14),transparent_26%),radial-gradient(circle_at_70%_90%,rgba(97,197,122,0.12),transparent_22%)]" />
          <div className="relative flex min-h-screen flex-col gap-8 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-cyan-200/72">
                  Dashboard V2 Preview
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  独立前端隔离层
                </h1>
              </div>
              <Button variant="secondary" size="sm" onClick={() => void handleRefresh()}>
                <RefreshCw className="size-4" />
                刷新
              </Button>
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

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
              <div className="grid gap-6">
                <SkillInventory isLoading={isLoadingSnapshot} snapshot={selectedSnapshot} />
                <ActivityFeed isLoading={isLoadingSnapshot} snapshot={selectedSnapshot} />
              </div>
              <div className="grid gap-6">
                <ModelUsagePanel isLoading={isLoadingSnapshot} snapshot={selectedSnapshot} />
                <div className="rounded-3xl border border-white/8 bg-white/6 p-5 shadow-[0_30px_80px_rgba(3,8,20,0.36)] backdrop-blur-xl">
                  <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-cyan-200/70">
                    Cutover
                  </p>
                  <div className="mt-4 space-y-3 text-sm text-slate-200/80">
                    <p>当前入口只消费现有 REST + SSE，不复用旧字符串 DOM 和全局类名。</p>
                    <p>下一阶段先迁 `Button / Badge / Card / Dialog / Table / Tabs` 六类核心件，再切 `技能 / 项目 / 活动` 三个主视图。</p>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button asChild variant="secondary" size="sm">
                      <a href="/">打开旧版</a>
                    </Button>
                    <Button asChild size="sm">
                      <a href="https://ui.shadcn.com/docs/installation/vite" target="_blank" rel="noreferrer">
                        shadcn Vite 文档
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
