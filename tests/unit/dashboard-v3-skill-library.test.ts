import { describe, expect, it } from 'vitest'

import {
  filterSkillFamilies,
  selectPreferredSkillInstance,
} from '../../frontend-v3/src/lib/skill-library.ts'
import type {
  DashboardSkillFamily,
  DashboardSkillInstance,
} from '../../frontend-v3/src/types/dashboard.ts'

const families: DashboardSkillFamily[] = [
  {
    familyId: 'family-debugging',
    familyName: 'systematic-debugging',
    status: 'active',
    runtimes: ['codex', 'claude'],
    instanceCount: 3,
    projectCount: 2,
    revisionCount: 7,
    usage: {
      observedCalls: 12,
      analyzedTouches: 2,
      optimizedCount: 1,
      firstSeenAt: '2026-04-01T00:00:00.000Z',
      lastSeenAt: '2026-04-20T00:00:00.000Z',
      lastUsedAt: '2026-04-20T00:00:00.000Z',
      status: 'active',
    },
  },
  {
    familyId: 'family-design',
    familyName: 'frontend-design',
    status: 'partial',
    runtimes: ['opencode'],
    instanceCount: 1,
    projectCount: 1,
    revisionCount: 2,
    usage: {
      observedCalls: 2,
      analyzedTouches: 0,
      optimizedCount: 0,
      firstSeenAt: '2026-04-10T00:00:00.000Z',
      lastSeenAt: '2026-04-18T00:00:00.000Z',
      lastUsedAt: '2026-04-18T00:00:00.000Z',
      status: 'partial',
    },
  },
]

const instances: DashboardSkillInstance[] = [
  {
    instanceId: 'inst-1',
    familyId: 'family-debugging',
    familyName: 'systematic-debugging',
    projectPath: '/Users/xuzhang/OrnnSkills',
    skillId: 'systematic-debugging',
    runtime: 'codex',
    status: 'active',
    lastUsedAt: '2026-04-20T00:00:00.000Z',
    effectiveVersion: 5,
    versionCount: 5,
    usage: {
      observedCalls: 10,
      analyzedTouches: 2,
      optimizedCount: 1,
      firstSeenAt: '2026-04-01T00:00:00.000Z',
      lastSeenAt: '2026-04-20T00:00:00.000Z',
      lastUsedAt: '2026-04-20T00:00:00.000Z',
      status: 'active',
    },
  },
  {
    instanceId: 'inst-2',
    familyId: 'family-debugging',
    familyName: 'systematic-debugging',
    projectPath: '/Users/xuzhang/mili',
    skillId: 'systematic-debugging',
    runtime: 'claude',
    status: 'active',
    lastUsedAt: '2026-04-22T00:00:00.000Z',
    effectiveVersion: 6,
    versionCount: 6,
    usage: {
      observedCalls: 3,
      analyzedTouches: 0,
      optimizedCount: 0,
      firstSeenAt: '2026-04-02T00:00:00.000Z',
      lastSeenAt: '2026-04-22T00:00:00.000Z',
      lastUsedAt: '2026-04-22T00:00:00.000Z',
      status: 'active',
    },
  },
  {
    instanceId: 'inst-3',
    familyId: 'family-debugging',
    familyName: 'systematic-debugging',
    projectPath: '/Users/xuzhang/OrnnSkills',
    skillId: 'systematic-debugging',
    runtime: 'claude',
    status: 'active',
    lastUsedAt: '2026-04-19T00:00:00.000Z',
    effectiveVersion: 4,
    versionCount: 4,
    usage: {
      observedCalls: 1,
      analyzedTouches: 0,
      optimizedCount: 0,
      firstSeenAt: '2026-04-03T00:00:00.000Z',
      lastSeenAt: '2026-04-19T00:00:00.000Z',
      lastUsedAt: '2026-04-19T00:00:00.000Z',
      status: 'active',
    },
  },
]

describe('dashboard v3 skill library helpers', () => {
  it('filters skill families by family name, runtime, and status signals', () => {
    expect(filterSkillFamilies(families, 'debug codex')).toEqual([families[0]])
    expect(filterSkillFamilies(families, 'partial')).toEqual([families[1]])
  })

  it('prefers the current project when choosing the active instance', () => {
    expect(
      selectPreferredSkillInstance(instances, {
        preferredProjectPath: '/Users/xuzhang/OrnnSkills',
      }),
    ).toEqual(instances[0])
  })

  it('falls back to the preferred runtime inside the selected project scope', () => {
    expect(
      selectPreferredSkillInstance(instances, {
        preferredProjectPath: '/Users/xuzhang/OrnnSkills',
        preferredRuntime: 'claude',
      }),
    ).toEqual(instances[2])
  })
})
