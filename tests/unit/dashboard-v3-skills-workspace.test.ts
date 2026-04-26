import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

import {
  buildSkillsOverview,
  paginateSkills,
} from '../../frontend-v3/src/lib/skills-workspace.ts'
import type { DashboardSkill } from '../../frontend-v3/src/types/dashboard.ts'

const skills: DashboardSkill[] = [
  {
    skillId: 'alpha',
    runtime: 'codex',
    status: 'active',
    traceCount: 24,
  },
  {
    skillId: 'beta',
    runtime: 'claude',
    status: 'success',
    traceCount: 15,
  },
  {
    skillId: 'gamma',
    runtime: 'codex',
    status: 'failed',
    traceCount: 3,
  },
  {
    skillId: 'delta',
    runtime: 'opencode',
    status: 'pending',
    traceCount: 0,
  },
  {
    skillId: 'epsilon',
    runtime: 'claude',
    status: 'active',
    traceCount: 9,
  },
]

const skillsTableSource = readFileSync(
  new URL('../../frontend-v3/src/components/skills-table.tsx', import.meta.url),
  'utf8',
)

describe('dashboard v3 skills workspace helpers', () => {
  it('builds a hero summary from the current skill collection', () => {
    expect(buildSkillsOverview(skills)).toEqual({
      evidenceSkillCount: 4,
      errorSkillCount: 1,
      runtimeCount: 3,
      totalSkills: 5,
      totalTraces: 51,
    })
  })

  it('paginates skills into stable table pages', () => {
    expect(paginateSkills(skills, 2, 2)).toEqual({
      currentPage: 2,
      hasNextPage: true,
      hasPreviousPage: true,
      pageItems: [skills[2], skills[3]],
      pageSize: 2,
      totalItems: 5,
      totalPages: 3,
    })
  })

  it('clamps invalid pages back into the valid range', () => {
    expect(paginateSkills(skills, 99, 2)).toEqual({
      currentPage: 3,
      hasNextPage: false,
      hasPreviousPage: true,
      pageItems: [skills[4]],
      pageSize: 2,
      totalItems: 5,
      totalPages: 3,
    })
  })

  it('keeps project skill table scoped by host instead of showing runtime and trace columns', () => {
    expect(skillsTableSource).toContain("aria-label={t('host')}")
    expect(skillsTableSource).toContain("t('evaluationCount')")
    expect(skillsTableSource).not.toContain('<TableHead>Runtime</TableHead>')
    expect(skillsTableSource).not.toContain("t('traces')")
    expect(skillsTableSource).not.toContain('skill.traceCount')
  })
})
