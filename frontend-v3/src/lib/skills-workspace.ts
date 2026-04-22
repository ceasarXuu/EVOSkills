import type { DashboardSkill } from '@/types/dashboard'
import { paginateItems, type PaginationResult } from './pagination'

export interface SkillsOverview {
  evidenceSkillCount: number
  errorSkillCount: number
  runtimeCount: number
  totalSkills: number
  totalTraces: number
}

export type SkillsPaginationResult<T> = PaginationResult<T>

export function buildSkillsOverview(skills: DashboardSkill[]): SkillsOverview {
  const runtimeSet = new Set<string>()
  let evidenceSkillCount = 0
  let errorSkillCount = 0
  let totalTraces = 0

  for (const skill of skills) {
    if (skill.runtime) {
      runtimeSet.add(skill.runtime)
    }

    if ((skill.traceCount ?? 0) > 0 || skill.lastUsedAt) {
      evidenceSkillCount += 1
    }

    if (skill.status === 'error' || skill.status === 'failed') {
      errorSkillCount += 1
    }

    totalTraces += skill.traceCount ?? 0
  }

  return {
    evidenceSkillCount,
    errorSkillCount,
    runtimeCount: runtimeSet.size,
    totalSkills: skills.length,
    totalTraces,
  }
}

export function paginateSkills<T>(
  items: T[],
  page: number,
  pageSize: number,
): SkillsPaginationResult<T> {
  return paginateItems(items, page, pageSize)
}
