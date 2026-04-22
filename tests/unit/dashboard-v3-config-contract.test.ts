import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const sources = {
  configWorkspace: readFileSync(
    new URL('../../frontend-v3/src/components/config-workspace.tsx', import.meta.url),
    'utf8',
  ),
  configProviderStack: readFileSync(
    new URL('../../frontend-v3/src/components/config-provider-stack.tsx', import.meta.url),
    'utf8',
  ),
  configGovernancePanel: readFileSync(
    new URL('../../frontend-v3/src/components/config-governance-panel.tsx', import.meta.url),
    'utf8',
  ),
  configWorkspaceLib: readFileSync(
    new URL('../../frontend-v3/src/lib/config-workspace.ts', import.meta.url),
    'utf8',
  ),
}

describe('dashboard v3 config contract', () => {
  it('removes v1-nonexistent config chrome and generic control-console copy', () => {
    const combined = Object.values(sources).join('\n')

    expect(combined).not.toContain('配置控制台')
    expect(combined).not.toContain('保存配置')
    expect(combined).not.toContain('Provider Health')
    expect(combined).not.toContain('Runtime Policy')
    expect(combined).not.toContain('Evolution Prompt Strategy')
    expect(combined).not.toContain('Log Level')
    expect(combined).not.toContain('Auto Optimize')
    expect(combined).not.toContain('Runtime Sync')
    expect(combined).not.toContain('User Confirm')
  })

  it('restores v1 config subtabs and prompt-source controls', () => {
    const combined = Object.values(sources).join('\n')

    expect(combined).toContain('模型')
    expect(combined).toContain('演进策略')
    expect(combined).toContain('内置系统提示词')
    expect(combined).toContain('用户自定义提示词')
  })

  it('restores v1 provider row actions', () => {
    const combined = Object.values(sources).join('\n')

    expect(combined).toContain('检查连通性')
    expect(combined).toContain('显示')
    expect(combined).toContain('隐藏')
    expect(combined).toContain('启用')
    expect(combined).not.toContain('Healthy')
    expect(combined).not.toContain('Unchecked')
    expect(combined).not.toContain('Attention')
  })
})
