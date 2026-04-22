import type { DashboardProject, DashboardSsePayload } from '@/types/dashboard'

export type DashboardView = 'projects' | 'skills' | 'activity'

const DASHBOARD_VIEWS: DashboardView[] = ['projects', 'skills', 'activity']

export const DEFAULT_DASHBOARD_VIEW: DashboardView = 'projects'

export function pickNextProject(
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

export function normalizeDashboardView(value: string | null | undefined): DashboardView {
  if (!value) {
    return DEFAULT_DASHBOARD_VIEW
  }

  return DASHBOARD_VIEWS.includes(value as DashboardView)
    ? (value as DashboardView)
    : DEFAULT_DASHBOARD_VIEW
}

export function isProjectSnapshotRefreshRequired(
  selectedProjectId: string,
  payload: DashboardSsePayload,
): boolean {
  if (!selectedProjectId || !Array.isArray(payload.changedProjects)) {
    return false
  }

  return payload.changedProjects.includes(selectedProjectId)
}
