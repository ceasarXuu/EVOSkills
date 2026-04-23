import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const viteConfigSource = readFileSync('frontend-v3/vite.config.ts', 'utf-8')

describe('dashboard v3 dev proxy contract', () => {
  it('proxies api and sse traffic to the daemon dashboard server by default', () => {
    expect(viteConfigSource).toContain("const DEFAULT_DASHBOARD_PROXY_TARGET = 'http://127.0.0.1:47432'")
    expect(viteConfigSource).toContain("'/api': {")
    expect(viteConfigSource).toContain("'/events': {")
    expect(viteConfigSource).toContain('ORNNSKILLS_DASHBOARD_PROXY_TARGET ?? DEFAULT_DASHBOARD_PROXY_TARGET')
  })
})
