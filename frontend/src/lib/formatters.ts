export function formatCompactNumber(value: number | null | undefined): string {
  if (!Number.isFinite(value)) {
    return '0'
  }

  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: value && value >= 10000 ? 1 : 0,
    notation: value && value >= 10000 ? 'compact' : 'standard',
  }).format(value ?? 0)
}

export function formatDuration(value: number | null | undefined): string {
  if (!Number.isFinite(value) || !value || value <= 0) {
    return '—'
  }

  if (value < 1000) {
    return `${Math.round(value)} ms`
  }

  if (value < 60000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, '')} s`
  }

  return `${(value / 60000).toFixed(1).replace(/\.0$/, '')} min`
}

export function formatRelativeTime(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return '未记录'
  }

  const target = new Date(timestamp).getTime()
  if (Number.isNaN(target)) {
    return timestamp
  }

  const delta = Date.now() - target
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (delta < minute) {
    return '刚刚'
  }

  if (delta < hour) {
    return `${Math.floor(delta / minute)} 分钟前`
  }

  if (delta < day) {
    return `${Math.floor(delta / hour)} 小时前`
  }

  return `${Math.floor(delta / day)} 天前`
}

export function formatProjectPath(projectPath: string | null | undefined): string {
  if (!projectPath) {
    return '未选择项目'
  }

  if (projectPath.length <= 44) {
    return projectPath
  }

  return `…${projectPath.slice(-42)}`
}
