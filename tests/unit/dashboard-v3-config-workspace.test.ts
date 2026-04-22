import { describe, expect, it } from 'vitest'
import {
  getConnectivityProviders,
  normalizeConfigSubTab,
  resolveDefaultProvider,
} from '../../frontend-v3/src/lib/config-workspace.ts'
import type { DashboardProviderConfig } from '../../frontend-v3/src/types/config.ts'

const providers: DashboardProviderConfig[] = [
  {
    provider: 'openai',
    modelName: 'openai/gpt-4o-mini',
    apiKeyEnvVar: 'OPENAI_API_KEY',
    apiKey: '',
    hasApiKey: false,
  },
  {
    provider: 'deepseek',
    modelName: 'deepseek/deepseek-chat',
    apiKeyEnvVar: 'DEEPSEEK_API_KEY',
    apiKey: '',
    hasApiKey: false,
  },
]

describe('dashboard v3 config workspace helpers', () => {
  it('normalizes config subtabs to the v1 contract', () => {
    expect(normalizeConfigSubTab(undefined)).toBe('model')
    expect(normalizeConfigSubTab('model')).toBe('model')
    expect(normalizeConfigSubTab('evolution')).toBe('evolution')
    expect(normalizeConfigSubTab('other')).toBe('model')
  })

  it('keeps the configured default provider when it still exists', () => {
    expect(resolveDefaultProvider(providers, 'deepseek')).toBe('deepseek')
  })

  it('falls back to the first provider when the default provider no longer exists', () => {
    expect(resolveDefaultProvider(providers, 'claude')).toBe('openai')
    expect(resolveDefaultProvider([], 'claude')).toBe('')
  })

  it('narrows connectivity checks to the selected row when requested', () => {
    expect(getConnectivityProviders(providers, 1)).toEqual([providers[1]])
    expect(getConnectivityProviders(providers, 9)).toEqual(providers)
    expect(getConnectivityProviders(providers, null)).toEqual(providers)
  })
})
