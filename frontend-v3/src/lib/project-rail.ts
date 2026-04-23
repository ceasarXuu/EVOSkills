import type { DashboardProject } from '@/types/dashboard'

function normalizeSearchTokens(query: string) {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

export function filterProjects(projects: DashboardProject[], query: string) {
  const tokens = normalizeSearchTokens(query)
  if (tokens.length === 0) {
    return projects
  }

  return projects.filter((project) => {
    const haystack = [project.name, project.path, project.monitoringState ?? '']
      .join(' ')
      .toLowerCase()

    return tokens.every((token) => haystack.includes(token))
  })
}
