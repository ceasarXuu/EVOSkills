import type {
  DashboardSkillFamily,
  DashboardSkillInstance,
  SkillDomainRuntime,
} from '@/types/dashboard'

function normalizeSearchTokens(query: string) {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

function instanceTimestamp(instance: DashboardSkillInstance) {
  return new Date(instance.lastUsedAt ?? instance.updatedAt ?? 0).getTime()
}

export function filterSkillFamilies(families: DashboardSkillFamily[], query: string) {
  const tokens = normalizeSearchTokens(query)
  if (tokens.length === 0) {
    return families
  }

  return families.filter((family) => {
    const haystack = [
      family.familyName,
      family.familyId,
      family.status ?? '',
      family.runtimes.join(' '),
    ]
      .join(' ')
      .toLowerCase()

    return tokens.every((token) => haystack.includes(token))
  })
}

export function sortSkillFamilies(families: DashboardSkillFamily[]) {
  return [...families].sort((left, right) => {
    const rightLastUsed = new Date(right.usage.lastUsedAt ?? right.lastUsedAt ?? 0).getTime()
    const leftLastUsed = new Date(left.usage.lastUsedAt ?? left.lastUsedAt ?? 0).getTime()
    if (rightLastUsed !== leftLastUsed) {
      return rightLastUsed - leftLastUsed
    }

    const usageDelta = (right.usage.observedCalls ?? 0) - (left.usage.observedCalls ?? 0)
    if (usageDelta !== 0) {
      return usageDelta
    }

    return left.familyName.localeCompare(right.familyName)
  })
}

interface PreferredInstanceOptions {
  currentInstanceId?: string | null
  preferredProjectPath?: string | null
  preferredRuntime?: SkillDomainRuntime | null
}

export function selectPreferredSkillInstance(
  instances: DashboardSkillInstance[],
  options: PreferredInstanceOptions = {},
) {
  if (instances.length === 0) {
    return null
  }

  const { currentInstanceId, preferredProjectPath, preferredRuntime } = options

  if (currentInstanceId) {
    const current = instances.find((instance) => instance.instanceId === currentInstanceId)
    if (current) {
      return current
    }
  }

  if (preferredProjectPath && preferredRuntime) {
    const projectRuntimeMatch = instances.find((instance) => {
      return instance.projectPath === preferredProjectPath && instance.runtime === preferredRuntime
    })
    if (projectRuntimeMatch) {
      return projectRuntimeMatch
    }
  }

  if (preferredProjectPath) {
    const projectInstances = instances
      .filter((instance) => instance.projectPath === preferredProjectPath)
      .sort((left, right) => instanceTimestamp(right) - instanceTimestamp(left))
    if (projectInstances.length > 0) {
      return projectInstances[0]
    }
  }

  if (preferredRuntime) {
    const runtimeInstances = instances
      .filter((instance) => instance.runtime === preferredRuntime)
      .sort((left, right) => instanceTimestamp(right) - instanceTimestamp(left))
    if (runtimeInstances.length > 0) {
      return runtimeInstances[0]
    }
  }

  return [...instances].sort((left, right) => instanceTimestamp(right) - instanceTimestamp(left))[0]
}
