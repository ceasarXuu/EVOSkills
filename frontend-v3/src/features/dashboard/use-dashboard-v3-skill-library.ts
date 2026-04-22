import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  applyDashboardSkillToFamily,
  fetchDashboardSkillApplyPreview,
  fetchDashboardSkillDetail,
  fetchDashboardSkillFamilies,
  fetchDashboardSkillFamily,
  fetchDashboardSkillFamilyInstances,
  fetchDashboardSkillVersion,
  logDashboardV3Event,
  saveDashboardSkillDetail,
  toggleDashboardSkillVersionDisabled,
} from '@/lib/dashboard-api'
import {
  filterSkillFamilies,
  selectPreferredSkillInstance,
  sortSkillFamilies,
} from '@/lib/skill-library'
import type {
  DashboardSkillApplyPreview,
  DashboardSkillDetail,
  DashboardSkillFamily,
  DashboardSkillInstance,
  DashboardSkillVersionMetadata,
  SkillDomainRuntime,
} from '@/types/dashboard'

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

export function useDashboardV3SkillLibrary(preferredProjectPath: string) {
  const [families, setFamilies] = useState<DashboardSkillFamily[]>([])
  const [selectedFamilyId, setSelectedFamilyId] = useState('')
  const [selectedFamily, setSelectedFamily] = useState<DashboardSkillFamily | null>(null)
  const [instances, setInstances] = useState<DashboardSkillInstance[]>([])
  const [selectedInstanceId, setSelectedInstanceId] = useState('')
  const [detail, setDetail] = useState<DashboardSkillDetail | null>(null)
  const [draftContent, setDraftContent] = useState('')
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)
  const [versionMetadataByNumber, setVersionMetadataByNumber] = useState<Record<number, DashboardSkillVersionMetadata>>({})
  const [preferredRuntime, setPreferredRuntime] = useState<SkillDomainRuntime>('codex')
  const [query, setQuery] = useState('')
  const [applyPreview, setApplyPreview] = useState<DashboardSkillApplyPreview | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [familiesError, setFamiliesError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isLoadingFamilies, setIsLoadingFamilies] = useState(true)
  const [isLoadingFamilyDetail, setIsLoadingFamilyDetail] = useState(false)
  const [isLoadingSkillDetail, setIsLoadingSkillDetail] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)

  const filteredFamilies = useMemo(() => {
    return sortSkillFamilies(filterSkillFamilies(families, query))
  }, [families, query])

  const selectedInstance = useMemo(() => {
    return instances.find((instance) => instance.instanceId === selectedInstanceId) ?? null
  }, [instances, selectedInstanceId])

  const reload = useCallback(() => {
    setRefreshToken((current) => current + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadFamilies() {
      setIsLoadingFamilies(true)
      setFamiliesError(null)

      try {
        const nextFamilies = await fetchDashboardSkillFamilies()
        if (cancelled) {
          return
        }

        setFamilies(nextFamilies)
        setSelectedFamilyId((current) => {
          if (current && nextFamilies.some((family) => family.familyId === current)) {
            return current
          }
          return nextFamilies[0]?.familyId ?? ''
        })
      } catch (error) {
        if (!cancelled) {
          setFamiliesError(getErrorMessage(error, '加载技能库失败。'))
        }
      } finally {
        if (!cancelled) {
          setIsLoadingFamilies(false)
        }
      }
    }

    void loadFamilies()
    return () => {
      cancelled = true
    }
  }, [refreshToken])

  useEffect(() => {
    if (!selectedFamilyId) {
      setSelectedFamily(null)
      setInstances([])
      setSelectedInstanceId('')
      return
    }

    let cancelled = false

    async function loadFamilyDetail() {
      setIsLoadingFamilyDetail(true)
      setDetailError(null)

      try {
        const [family, nextInstances] = await Promise.all([
          fetchDashboardSkillFamily(selectedFamilyId),
          fetchDashboardSkillFamilyInstances(selectedFamilyId),
        ])
        if (cancelled) {
          return
        }

        setSelectedFamily(family)
        setInstances(nextInstances)
        const preferredInstance = selectPreferredSkillInstance(nextInstances, {
          currentInstanceId: selectedInstanceId,
          preferredProjectPath,
          preferredRuntime,
        })
        setSelectedInstanceId(preferredInstance?.instanceId ?? '')
      } catch (error) {
        if (!cancelled) {
          setDetailError(getErrorMessage(error, '加载技能族详情失败。'))
        }
      } finally {
        if (!cancelled) {
          setIsLoadingFamilyDetail(false)
        }
      }
    }

    void loadFamilyDetail()
    return () => {
      cancelled = true
    }
  }, [preferredProjectPath, preferredRuntime, selectedFamilyId, selectedInstanceId, refreshToken])

  useEffect(() => {
    if (!selectedInstance) {
      setDetail(null)
      setDraftContent('')
      setVersionMetadataByNumber({})
      setSelectedVersion(null)
      setApplyPreview(null)
      return
    }

    const instance = selectedInstance
    let cancelled = false

    async function loadSkillDetail() {
      setIsLoadingSkillDetail(true)
      setDetailError(null)

      try {
        const nextDetail = await fetchDashboardSkillDetail(
          instance.projectPath,
          instance.skillId,
          instance.runtime,
        )
        const versionEntries = await Promise.all(
          nextDetail.versions.map(async (version) => {
            const record = await fetchDashboardSkillVersion(
              instance.projectPath,
              instance.skillId,
              instance.runtime,
              version,
              instance.instanceId,
            )
            return [version, record.metadata] as const
          }),
        )
        if (cancelled) {
          return
        }

        setDetail(nextDetail)
        setDraftContent(nextDetail.content ?? '')
        setSelectedVersion(
          nextDetail.effectiveVersion ?? nextDetail.versions[nextDetail.versions.length - 1] ?? null,
        )
        setVersionMetadataByNumber(Object.fromEntries(versionEntries))
        setPreferredRuntime(instance.runtime)
        setApplyPreview(null)
      } catch (error) {
        if (!cancelled) {
          setDetail(null)
          setDraftContent('')
          setVersionMetadataByNumber({})
          setSelectedVersion(null)
          setDetailError(getErrorMessage(error, '加载技能正文失败。'))
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSkillDetail(false)
        }
      }
    }

    void loadSkillDetail()
    return () => {
      cancelled = true
    }
  }, [selectedInstance, refreshToken])

  const selectFamily = useCallback((familyId: string) => {
    setSelectedFamilyId(familyId)
    setActionMessage(null)
    logDashboardV3Event('skill_library.family_selected', { familyId })
  }, [])

  const selectInstance = useCallback((instanceId: string) => {
    setSelectedInstanceId(instanceId)
    setActionMessage(null)
    logDashboardV3Event('skill_library.instance_selected', { instanceId })
  }, [])

  const switchRuntime = useCallback(
    (runtime: SkillDomainRuntime) => {
      setPreferredRuntime(runtime)
      const runtimeInstances = instances.filter((instance) => instance.runtime === runtime)
      const preferredInstance = selectPreferredSkillInstance(runtimeInstances, {
        preferredProjectPath,
        preferredRuntime: runtime,
      })
      if (preferredInstance) {
        setSelectedInstanceId(preferredInstance.instanceId)
      }
      logDashboardV3Event('skill_library.runtime_switched', {
        familyId: selectedFamilyId,
        runtime,
      })
    },
    [instances, preferredProjectPath, selectedFamilyId],
  )

  const loadVersion = useCallback(
    async (version: number) => {
      if (!selectedInstance || !detail) {
        return
      }

      try {
        const record = await fetchDashboardSkillVersion(
          selectedInstance.projectPath,
          selectedInstance.skillId,
          selectedInstance.runtime,
          version,
          selectedInstance.instanceId,
        )
        setDraftContent(record.content)
        setSelectedVersion(version)
        setVersionMetadataByNumber((current) => ({
          ...current,
          [version]: record.metadata,
        }))
        logDashboardV3Event('skill_library.version_selected', {
          familyId: selectedFamilyId,
          instanceId: selectedInstance.instanceId,
          version,
        })
      } catch (error) {
        setActionMessage(getErrorMessage(error, '加载版本失败。'))
      }
    },
    [detail, selectedFamilyId, selectedInstance],
  )

  const save = useCallback(async () => {
    if (!selectedInstance || !detail) {
      return
    }

    setIsSaving(true)
    setActionMessage('保存中')

    try {
      const result = await saveDashboardSkillDetail({
        content: draftContent,
        instanceId: selectedInstance.instanceId,
        projectPath: selectedInstance.projectPath,
        reason: 'Manual edit from dashboard v3',
        runtime: selectedInstance.runtime,
        skillId: selectedInstance.skillId,
      })
      setActionMessage(result.unchanged ? '没有正文变更' : `已保存 v${result.version ?? '--'}`)
      reload()
    } catch (error) {
      setActionMessage(getErrorMessage(error, '保存失败。'))
    } finally {
      setIsSaving(false)
    }
  }, [detail, draftContent, reload, selectedInstance])

  const toggleVersionDisabled = useCallback(
    async (version: number, disabled: boolean) => {
      if (!selectedInstance || !detail) {
        return
      }

      try {
        const result = await toggleDashboardSkillVersionDisabled({
          disabled,
          instanceId: selectedInstance.instanceId,
          projectPath: selectedInstance.projectPath,
          runtime: selectedInstance.runtime,
          skillId: selectedInstance.skillId,
          version,
        })

        setVersionMetadataByNumber((current) => ({
          ...current,
          [version]: result.metadata ?? current[version],
        }))
        setDetail((current) => {
          if (!current) {
            return current
          }

          return {
            ...current,
            effectiveVersion: result.effectiveVersion ?? current.effectiveVersion,
          }
        })
        setActionMessage(disabled ? `已停用 v${version}` : `已恢复 v${version}`)
        reload()
      } catch (error) {
        setActionMessage(getErrorMessage(error, '切换版本状态失败。'))
      }
    },
    [detail, reload, selectedInstance],
  )

  const loadApplyPreview = useCallback(async () => {
    if (!selectedInstance) {
      return
    }

    try {
      const preview = await fetchDashboardSkillApplyPreview(
        selectedInstance.projectPath,
        selectedInstance.instanceId,
      )
      setApplyPreview(preview)
    } catch (error) {
      setActionMessage(getErrorMessage(error, '加载传播预览失败。'))
    }
  }, [selectedInstance])

  const applyToFamily = useCallback(async () => {
    if (!selectedInstance) {
      return
    }

    setIsApplying(true)
    setActionMessage('正在应用到同族实例')

    try {
      const result = await applyDashboardSkillToFamily({
        content: draftContent,
        instanceId: selectedInstance.instanceId,
        projectPath: selectedInstance.projectPath,
        reason: 'Manual edit from dashboard v3',
      })
      setActionMessage(
        `已更新 ${result.updatedTargets ?? 0} 个，跳过 ${result.skippedTargets ?? 0} 个`,
      )
      reload()
    } catch (error) {
      setActionMessage(getErrorMessage(error, '应用到同族实例失败。'))
    } finally {
      setIsApplying(false)
    }
  }, [draftContent, reload, selectedInstance])

  return {
    actionMessage,
    applyToFamily,
    applyPreview,
    detail,
    detailError,
    draftContent,
    families: filteredFamilies,
    familiesError,
    instances,
    isApplying,
    isLoadingFamilies,
    isLoadingFamilyDetail,
    isLoadingSkillDetail,
    isSaving,
    loadApplyPreview,
    loadVersion,
    preferredRuntime,
    query,
    save,
    selectedFamily,
    selectedFamilyId,
    selectedInstance,
    selectedInstanceId,
    selectedVersion,
    selectFamily,
    selectInstance,
    setDraftContent,
    setQuery,
    switchRuntime,
    toggleVersionDisabled,
    versionMetadataByNumber,
  }
}
