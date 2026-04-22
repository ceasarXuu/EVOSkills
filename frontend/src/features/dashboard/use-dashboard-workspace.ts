import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  connectDashboardEvents,
  fetchDashboardProjects,
  fetchProjectSnapshot,
  installDashboardErrorReporting,
  logDashboardUiEvent,
} from '@/lib/dashboard-client'
import type {
  ConnectionState,
  DashboardProject,
  DashboardSsePayload,
  ProjectSnapshot,
} from '@/types/dashboard'
import {
  isProjectSnapshotRefreshRequired,
  pickNextProject,
} from '@/features/dashboard/workspace-state'

interface LoadSnapshotOptions {
  force?: boolean
  source?: string
}

export function useDashboardWorkspace() {
  const [projects, setProjects] = useState<DashboardProject[]>([])
  const [selectedProjectId, setSelectedProjectIdState] = useState<string>('')
  const [snapshotMap, setSnapshotMap] = useState<Record<string, ProjectSnapshot>>({})
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState('')

  const selectedProjectIdRef = useRef(selectedProjectId)
  const snapshotMapRef = useRef(snapshotMap)

  useEffect(() => {
    selectedProjectIdRef.current = selectedProjectId
  }, [selectedProjectId])

  useEffect(() => {
    snapshotMapRef.current = snapshotMap
  }, [snapshotMap])

  const selectedProject = useMemo(
    () => projects.find((project) => project.path === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )

  const selectedSnapshot = useMemo(
    () => (selectedProjectId ? snapshotMap[selectedProjectId] ?? null : null),
    [selectedProjectId, snapshotMap],
  )

  const setSelectedProjectId = useCallback((projectId: string) => {
    setSelectedProjectIdState(projectId)
    if (projectId) {
      logDashboardUiEvent('workspace.project_selected', { projectId })
    }
  }, [])

  const loadProjects = useCallback(async () => {
    setIsLoadingProjects(true)
    setLoadError('')

    try {
      const nextProjects = await fetchDashboardProjects()
      setProjects(nextProjects)
      setSelectedProjectIdState((currentProjectId) => pickNextProject(nextProjects, currentProjectId))
      setLastSyncedAt(new Date().toISOString())
      logDashboardUiEvent('workspace.projects_loaded', {
        projectCount: nextProjects.length,
      })
      return nextProjects
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setLoadError(message)
      logDashboardUiEvent('workspace.projects_load_failed', {
        message,
      })
      return []
    } finally {
      setIsLoadingProjects(false)
    }
  }, [])

  const loadSnapshot = useCallback(async (
    projectId: string,
    options: LoadSnapshotOptions = {},
  ) => {
    if (!projectId) {
      return null
    }

    const { force = false, source = 'unknown' } = options
    if (!force && snapshotMapRef.current[projectId]) {
      return snapshotMapRef.current[projectId]
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
      logDashboardUiEvent('workspace.snapshot_loaded', {
        projectId,
        source,
        skillCount: snapshot.skills?.length ?? 0,
        recentTraceCount: snapshot.recentTraces?.length ?? 0,
      })
      return snapshot
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setLoadError(message)
      logDashboardUiEvent('workspace.snapshot_load_failed', {
        message,
        projectId,
        source,
      })
      return null
    } finally {
      setIsLoadingSnapshot(false)
    }
  }, [])

  const refreshWorkspace = useCallback(async () => {
    const nextProjects = await loadProjects()
    const nextProjectId = pickNextProject(nextProjects, selectedProjectIdRef.current)
    if (nextProjectId) {
      await loadSnapshot(nextProjectId, {
        force: true,
        source: 'manual_refresh',
      })
    }
  }, [loadProjects, loadSnapshot])

  useEffect(() => {
    installDashboardErrorReporting()
    void loadProjects()
  }, [loadProjects])

  useEffect(() => {
    if (!selectedProjectId) {
      return
    }

    void loadSnapshot(selectedProjectId, { source: 'selection' })
  }, [loadSnapshot, selectedProjectId])

  useEffect(() => {
    const dispose = connectDashboardEvents(
      async (payload: DashboardSsePayload) => {
        if (Array.isArray(payload.projects)) {
          setProjects(payload.projects)
          setSelectedProjectIdState((currentProjectId) =>
            pickNextProject(payload.projects ?? [], currentProjectId),
          )
        }

        if (isProjectSnapshotRefreshRequired(selectedProjectIdRef.current, payload)) {
          await loadSnapshot(selectedProjectIdRef.current, {
            force: true,
            source: 'sse',
          })
        }
      },
      setConnectionState,
    )

    return dispose
  }, [loadSnapshot])

  return {
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
  }
}
