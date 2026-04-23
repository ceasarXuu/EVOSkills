import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const configHookSource = readFileSync(
  new URL('../../frontend-v3/src/features/dashboard/use-dashboard-v3-config.ts', import.meta.url),
  'utf8',
)

describe('dashboard v3 config cache contract', () => {
  it('hydrates the config workspace from a module cache before running a background refresh', () => {
    expect(configHookSource).toContain('let dashboardV3ConfigCache')
    expect(configHookSource).toContain('getInitialDashboardV3ConfigState')
    expect(configHookSource).toContain('isLoading: false')
    expect(configHookSource).toContain('void runRefresh({ showLoading: dashboardV3ConfigCache === null })')
  })
})
