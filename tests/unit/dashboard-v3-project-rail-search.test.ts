import { describe, expect, it } from 'vitest'
import { filterProjects } from '../../frontend-v3/src/lib/project-rail'
import type { DashboardProject } from '../../frontend-v3/src/types/dashboard'

const projects: DashboardProject[] = [
  {
    name: 'OrnnSkills',
    path: '/Users/xuzhang/OrnnSkills',
    monitoringState: 'active',
    skillCount: 112,
  },
  {
    name: 'mili',
    path: '/Users/xuzhang/mili',
    monitoringState: 'paused',
    skillCount: 118,
  },
  {
    name: 'NBComic',
    path: '/Users/xuzhang/NBComic',
    monitoringState: 'active',
    skillCount: 112,
  },
]

describe('dashboard v3 project rail search', () => {
  it('returns all projects when the query is empty', () => {
    expect(filterProjects(projects, '')).toEqual(projects)
  })

  it('filters projects by name, path, and monitoring state tokens', () => {
    expect(filterProjects(projects, 'mili')).toEqual([projects[1]])
    expect(filterProjects(projects, 'NBComic')).toEqual([projects[2]])
    expect(filterProjects(projects, 'ornn active')).toEqual([projects[0]])
    expect(filterProjects(projects, 'Users paused')).toEqual([projects[1]])
  })
})
