export type MarketEntryGroup = 'directory' | 'repository'
export type MarketEntryTrust = 'official' | 'community' | 'reference'

export interface MarketEntryConfig {
  id: string
  url: string
  group: MarketEntryGroup
  name?: string
  description?: string
  coverUrl?: string
  iconUrl?: string
  trust?: MarketEntryTrust
  hosts?: string[]
  tags?: string[]
}

export interface MarketEntry extends MarketEntryConfig {
  displayName: string
  displayHost: string
  displayUrl: string
  resolvedIconUrl: string
  initials: string
}

export const MARKET_ENTRY_CONFIGS: MarketEntryConfig[] = [
  {
    id: 'skills-sh',
    url: 'https://skills.sh/',
    group: 'directory',
    description: 'Agent Skills directory for browsing popular skill collections.',
    trust: 'community',
    hosts: ['Codex', 'Claude Code', 'Cursor'],
    tags: ['Directory', 'Discovery'],
  },
  {
    id: 'findskills',
    name: 'FindSkills',
    url: 'https://findskills.org/',
    group: 'directory',
    description: 'Searchable directory for Claude, Codex, OpenClaw, and other agent skills.',
    trust: 'community',
    hosts: ['Codex', 'Claude Code', 'OpenClaw'],
    tags: ['Directory', 'CLI'],
  },
  {
    id: 'agent-skill-sh',
    name: 'AgentSkill.sh',
    url: 'https://agentskill.sh/',
    group: 'directory',
    description: 'Large-scale agent skills index with source, quality, and security metadata.',
    trust: 'reference',
    hosts: ['Claude Code', 'Cursor', 'OpenClaw'],
    tags: ['Index', 'Signals'],
  },
  {
    id: 'openai-skills',
    name: 'OpenAI Skills',
    url: 'https://github.com/openai/skills',
    group: 'repository',
    description: 'Skills catalog for Codex and Agent Skills-compatible workflows.',
    trust: 'official',
    hosts: ['Codex'],
    tags: ['GitHub', 'Catalog'],
  },
  {
    id: 'anthropic-skills',
    name: 'Anthropic Skills',
    url: 'https://github.com/anthropics/skills',
    group: 'repository',
    description: 'Anthropic Agent Skills implementation, examples, and specification-adjacent resources.',
    trust: 'official',
    hosts: ['Claude Code'],
    tags: ['GitHub', 'Spec'],
  },
  {
    id: 'vercel-labs-skills',
    name: 'Vercel Labs Skills',
    url: 'https://github.com/vercel-labs/skills',
    group: 'repository',
    description: 'Agent skills tooling and Vercel Labs skill distribution entrypoint.',
    trust: 'official',
    hosts: ['Codex', 'Claude Code'],
    tags: ['GitHub', 'Tooling'],
  },
  {
    id: 'awesome-agent-skills',
    url: 'https://github.com/kodustech/awesome-agent-skills',
    group: 'repository',
    description: 'Curated community list for agent skills across Claude Code, Codex, and Cursor.',
    trust: 'community',
    hosts: ['Codex', 'Claude Code', 'Cursor'],
    tags: ['Awesome List'],
  },
  {
    id: 'awesome-claude-skills',
    url: 'https://github.com/VoltAgent/awesome-claude-skills',
    group: 'repository',
    description: 'Community collection of Claude and Agent Skills resources.',
    trust: 'community',
    hosts: ['Claude Code'],
    tags: ['Awesome List'],
  },
]

export function resolveMarketEntries(configs: MarketEntryConfig[] = MARKET_ENTRY_CONFIGS): MarketEntry[] {
  return configs.map(resolveMarketEntry)
}

export function resolveMarketEntry(config: MarketEntryConfig): MarketEntry {
  const parsedUrl = new URL(config.url)
  const displayHost = parsedUrl.hostname.replace(/^www\./, '')
  const displayName = config.name || inferNameFromUrl(parsedUrl)

  return {
    ...config,
    displayHost,
    displayName,
    displayUrl: `${displayHost}${parsedUrl.pathname === '/' ? '' : parsedUrl.pathname.replace(/\/$/, '')}`,
    resolvedIconUrl: config.iconUrl || resolveFaviconUrl(parsedUrl),
    initials: buildInitials(displayName),
  }
}

export function inferNameFromUrl(url: URL): string {
  const pathParts = url.pathname.split('/').filter(Boolean)
  if (url.hostname === 'github.com' && pathParts.length >= 2) {
    return titleCaseWords(pathParts.slice(0, 2).join(' '))
  }

  const host = url.hostname.replace(/^www\./, '').split('.')[0]
  return titleCaseWords(host.replace(/[-_]/g, ' '))
}

export function resolveFaviconUrl(url: URL): string {
  return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url.origin)}&sz=64`
}

function buildInitials(name: string): string {
  return name
    .split(/[\s/-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
