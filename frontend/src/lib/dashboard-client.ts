import type {
  ConnectionState,
  DashboardProjectsResponse,
  DashboardSsePayload,
  ProjectSnapshot,
} from '@/types/dashboard'

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return (await response.json()) as T
}

function encodeProjectPath(projectPath: string): string {
  return encodeURIComponent(projectPath)
}

async function reportClientError(payload: Record<string, unknown>) {
  try {
    await fetch('/api/dashboard/client-errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch {
    // Ignore client-side telemetry failures.
  }
}

export async function fetchDashboardProjects() {
  const data = await fetchJson<DashboardProjectsResponse>('/api/projects')
  return Array.isArray(data.projects) ? data.projects : []
}

export async function fetchProjectSnapshot(projectPath: string) {
  return await fetchJson<ProjectSnapshot>(
    `/api/projects/${encodeProjectPath(projectPath)}/snapshot`,
  )
}

export function connectDashboardEvents(
  onUpdate: (payload: DashboardSsePayload) => void | Promise<void>,
  onStateChange: (state: ConnectionState) => void,
) {
  const source = new EventSource('/events')
  onStateChange('connecting')

  source.addEventListener('open', () => {
    onStateChange('connected')
  })

  source.addEventListener('update', (event) => {
    void (async () => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as DashboardSsePayload
        await onUpdate(payload)
      } catch (error) {
        await reportClientError({
          message: 'dashboard-v2 failed to parse update payload',
          source: 'dashboard-v2.sse.update',
          stack: error instanceof Error ? error.stack : String(error),
        })
      }
    })()
  })

  source.addEventListener('error', () => {
    onStateChange('reconnecting')
  })

  return () => {
    source.close()
  }
}

export function installDashboardErrorReporting() {
  window.addEventListener('error', (event) => {
    void reportClientError({
      message: event.message,
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error instanceof Error ? event.error.stack : '',
      href: window.location.href,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    void reportClientError({
      message: `Unhandled promise rejection: ${String(event.reason)}`,
      source: 'dashboard-v2.unhandledrejection',
      stack: event.reason instanceof Error ? event.reason.stack : '',
      href: window.location.href,
    })
  })
}
