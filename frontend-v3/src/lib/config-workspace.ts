import { getDashboardSystemPromptDefaults } from '../../../src/core/prompt-defaults'
import type { DashboardProviderCatalogEntry, DashboardProviderConfig } from '@/types/config'

export type DashboardConfigSubTab = 'model' | 'evolution'

export const CONFIG_TEXT = {
  addProvider: '新增模型服务',
  apiKeyHide: '隐藏',
  apiKeyPastePlaceholder: '直接粘贴 API Key',
  apiKeyShow: '显示',
  builtInPrompt: '内置系统提示词',
  catalogCustomOnly: 'LiteLLM 列表未就绪（仅可自定义）',
  catalogErrorPrefix: 'LiteLLM 列表错误：',
  catalogLoading: 'LiteLLM 列表加载中...',
  checkConnectivity: '检查连通性',
  connectivityChecking: '检查中...',
  connectivityCheckingHint: '连通性检查中...',
  connectivityDone: '连通性检查完成',
  connectivityEmpty: '暂无模型服务',
  connectivityFailed: '连通性检查失败',
  connectivityTitle: '模型服务连通性',
  customModelPlaceholder: '自定义 model（例如：grok-3）',
  customOption: '自定义',
  customPrompt: '用户自定义提示词',
  customProviderPlaceholder: '自定义模型服务 ID（例如：xai）',
  evolutionSubTab: '演进策略',
  llmSafetyConcurrent: '最大并发请求数',
  llmSafetyEnabled: '启用安全闸门',
  llmSafetyHelp: '在请求真正发到模型服务前，拦截异常突发或失控重试的调用。',
  llmSafetyLabel: 'LLM 安全闸门',
  llmSafetyRequests: '窗口内最大请求数',
  llmSafetyTokens: '窗口内最大预计 Tokens',
  llmSafetyWindow: '滚动窗口（毫秒）',
  loadErrorPrefix: '远端配置加载失败：',
  loading: '配置加载中...',
  modelSubTab: '模型',
  noProviders: '暂无模型服务，请点击下方按钮添加。',
  promptDecisionExplainerLabel: '决策解释器',
  promptDecisionExplainerPlaceholder: '补充 dashboard 文案风格、长度、语气等解释约束。',
  promptHelp: '为每个分析阶段选择使用内置系统提示词，还是使用你自定义的提示词。',
  promptLabel: '提示词配置',
  promptReadinessProbeLabel: 'Readiness Probe',
  promptReadinessProbePlaceholder: '补充何时继续等待、拆分窗口或启动深度分析的判断规则。',
  promptSkillCallAnalyzerLabel: 'Skill 调用分析器',
  promptSkillCallAnalyzerPlaceholder:
    '补充窗口分诊、归因判断、apply_optimization 触发阈值等规则。',
  providerActiveLabel: '启用',
  providersHelp:
    '通过下拉和输入框配置模型服务：选择模型服务，选择或输入模型，直接粘贴 API Key，并且只启用其中一个默认模型服务。',
  providersLabel: '模型服务列表',
  removeProvider: '删除',
  retry: '重试',
  saveAuto: '已自动保存',
  saveFailed: '配置保存失败',
  saveSaving: '保存中...',
} as const

export function normalizeConfigSubTab(value: unknown): DashboardConfigSubTab {
  return value === 'evolution' ? 'evolution' : 'model'
}

export function resolveDefaultProvider(
  providers: DashboardProviderConfig[],
  fallbackDefaultProvider: string,
): string {
  const matchedProvider = providers.find(
    (provider) => provider.provider.trim() === fallbackDefaultProvider.trim(),
  )
  if (matchedProvider) {
    return matchedProvider.provider
  }

  return providers[0]?.provider || ''
}

export function getConnectivityProviders(
  providers: DashboardProviderConfig[],
  rowIndex: number | null | undefined,
) {
  if (
    typeof rowIndex === 'number' &&
    Number.isInteger(rowIndex) &&
    rowIndex >= 0 &&
    rowIndex < providers.length
  ) {
    return [providers[rowIndex]]
  }

  return providers
}

export function isKnownProvider(
  providerCatalog: DashboardProviderCatalogEntry[],
  providerId: string,
) {
  return providerCatalog.some((entry) => entry.id === providerId)
}

export function isKnownModel(
  providerCatalog: DashboardProviderCatalogEntry[],
  providerId: string,
  modelName: string,
) {
  return providerCatalog
    .find((entry) => entry.id === providerId)
    ?.models.includes(modelName) ?? false
}

export function guessApiKeyEnvVar(providerId: string) {
  const normalizedProvider = providerId.trim().replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()
  return normalizedProvider ? `${normalizedProvider}_API_KEY` : ''
}

export function getPromptDefaults() {
  return getDashboardSystemPromptDefaults('zh')
}
