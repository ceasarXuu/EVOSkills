import type {
  ConnectionState,
  DashboardMetricBucket,
  DashboardSkill,
} from '@/types/dashboard'

export function formatCompactNumber(value?: number | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0'
  }

  return new Intl.NumberFormat('zh-CN', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value)
}

export function formatCompactNumberForLocale(value: number | null | undefined, locale: string): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0'
  }

  return new Intl.NumberFormat(locale, {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value)
}

export function formatTokenCount(value?: number | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0'
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }

  return formatCompactNumber(value)
}

export function formatDuration(durationMs?: number | null): string {
  if (typeof durationMs !== 'number' || Number.isNaN(durationMs) || durationMs <= 0) {
    return '0 ms'
  }

  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(durationMs >= 10_000 ? 0 : 1)} s`
  }

  return `${Math.round(durationMs)} ms`
}

export function formatDateTime(value?: string | null, locale = 'zh-CN', fallback = '暂无'): string {
  if (!value) {
    return fallback
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return fallback
  }

  return new Intl.DateTimeFormat(locale, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatRelativeTime(value?: string | null, locale = 'zh-CN', fallback = '暂无'): string {
  if (!value) {
    return fallback
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return fallback
  }

  const diffMs = date.getTime() - Date.now()
  const diffAbs = Math.abs(diffMs)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (diffAbs < 60_000) {
    return formatter.format(Math.round(diffMs / 1000), 'second')
  }

  if (diffAbs < 3_600_000) {
    return formatter.format(Math.round(diffMs / 60_000), 'minute')
  }

  if (diffAbs < 86_400_000) {
    return formatter.format(Math.round(diffMs / 3_600_000), 'hour')
  }

  return formatter.format(Math.round(diffMs / 86_400_000), 'day')
}

export function getConnectionBadgeVariant(state: ConnectionState) {
  switch (state) {
    case 'connected':
      return 'default'
    case 'reconnecting':
      return 'secondary'
    case 'error':
      return 'destructive'
    default:
      return 'outline'
  }
}

export function getMonitoringBadgeVariant(state?: string | null) {
  if (state === 'active') {
    return 'default'
  }

  if (state === 'paused') {
    return 'secondary'
  }

  return 'outline'
}

export function getSkillStatusBadgeVariant(status?: string | null) {
  if (status === 'success' || status === 'active') {
    return 'default'
  }

  if (status === 'error' || status === 'failed') {
    return 'destructive'
  }

  return 'secondary'
}

export function sortSkills(skills: DashboardSkill[]) {
  return [...skills].sort((left, right) => {
    const rightWeight = right.traceCount ?? 0
    const leftWeight = left.traceCount ?? 0
    if (rightWeight !== leftWeight) {
      return rightWeight - leftWeight
    }

    const rightUpdated = new Date(right.updatedAt ?? 0).getTime()
    const leftUpdated = new Date(left.updatedAt ?? 0).getTime()
    return rightUpdated - leftUpdated
  })
}

export function getBucketShare(
  bucket: DashboardMetricBucket | undefined,
  total: DashboardMetricBucket | undefined,
): number {
  const totalCalls = total?.callCount ?? 0
  const bucketCalls = bucket?.callCount ?? 0
  if (totalCalls <= 0 || bucketCalls <= 0) {
    return 0
  }

  return Math.min(100, Math.max(6, Math.round((bucketCalls / totalCalls) * 100)))
}
