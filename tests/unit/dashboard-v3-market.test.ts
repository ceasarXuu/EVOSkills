import { describe, expect, it } from 'vitest'

import {
  MARKET_ENTRY_CONFIGS,
  inferNameFromUrl,
  resolveMarketEntry,
  resolveMarketEntries,
} from '../../frontend-v3/src/lib/market-directory.ts'

describe('dashboard v3 market directory', () => {
  it('keeps market entries data-driven for cheap expansion', () => {
    const entries = resolveMarketEntries()

    expect(entries.length).toBeGreaterThanOrEqual(18)
    expect(entries.some((entry) => entry.group === 'directory')).toBe(true)
    expect(entries.some((entry) => entry.group === 'repository')).toBe(true)
    expect(entries.every((entry) => entry.url.startsWith('https://'))).toBe(true)
  })

  it('initializes mainstream directories and repository sources', () => {
    const ids = MARKET_ENTRY_CONFIGS.map((entry) => entry.id)

    expect(ids).toEqual(
      expect.arrayContaining([
        'skills-sh',
        'skillsmp',
        'agent-skill-sh',
        'openai-skills',
        'anthropic-skills',
        'anthropic-claude-plugins-official',
        'vercel-labs-agent-skills',
        'firebase-agent-skills',
        'awesome-agent-skills',
      ]),
    )
  })

  it('auto-resolves display names and favicons when config stays minimal', () => {
    const entry = resolveMarketEntry({
      id: 'minimal',
      url: 'https://github.com/example/awesome-skills',
      group: 'repository',
    })

    expect(entry.displayName).toBe('Example Awesome Skills')
    expect(entry.displayHost).toBe('github.com')
    expect(entry.resolvedIconUrl).toContain('domain_url=https%3A%2F%2Fgithub.com')
    expect(entry.initials).toBe('EA')
  })

  it('allows explicit names and covers to override automatic defaults', () => {
    const entry = resolveMarketEntry({
      id: 'custom',
      name: 'Custom Market',
      url: 'https://example.com/skills',
      group: 'directory',
      coverUrl: 'https://cdn.example.com/cover.png',
      iconUrl: 'https://cdn.example.com/icon.png',
    })

    expect(entry.displayName).toBe('Custom Market')
    expect(entry.coverUrl).toBe('https://cdn.example.com/cover.png')
    expect(entry.resolvedIconUrl).toBe('https://cdn.example.com/icon.png')
  })

  it('derives readable names from common non-GitHub hosts', () => {
    expect(inferNameFromUrl(new URL('https://skills.sh/'))).toBe('Skills')
    expect(MARKET_ENTRY_CONFIGS.find((entry) => entry.id === 'skills-sh')?.name).toBeUndefined()
  })
})
