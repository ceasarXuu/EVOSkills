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
    id: 'skillsmp',
    name: 'SkillsMP',
    url: 'https://skillsmp.com/',
    group: 'directory',
    description: 'Open marketplace for Agent Skills across Claude Code, Codex, and AI coding tools.',
    trust: 'community',
    hosts: ['Codex', 'Claude Code'],
    tags: ['Marketplace', 'SKILL.md'],
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
    id: 'findskill-top',
    name: 'FindSkill.top',
    url: 'https://findskill.top/en/',
    group: 'directory',
    description: 'Large AI agent skills directory covering Claude Code, Cursor, Copilot, Windsurf, and more.',
    trust: 'reference',
    hosts: ['Claude Code', 'Cursor', 'Copilot'],
    tags: ['Directory', 'Large Index'],
  },
  {
    id: 'agensi',
    name: 'Agensi',
    url: 'https://www.agensi.io/skills',
    group: 'directory',
    description: 'Curated SKILL.md marketplace with free and paid skills for agent workflows.',
    trust: 'community',
    hosts: ['Codex', 'Claude Code', 'Cursor', 'Gemini CLI'],
    tags: ['Marketplace', 'Paid Skills'],
  },
  {
    id: 'skill-broker',
    name: 'skill.broker',
    url: 'https://skill.broker/',
    group: 'directory',
    description: 'Marketplace focused on buying and selling verified SKILL.md files.',
    trust: 'reference',
    hosts: ['Claude Code', 'Codex'],
    tags: ['Marketplace', 'Verified'],
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
    id: 'anthropic-claude-plugins-official',
    name: 'Anthropic Claude Plugins',
    url: 'https://github.com/anthropics/claude-plugins-official',
    group: 'repository',
    description: 'Anthropic-managed Claude Code plugin directory with skill-related plugin examples.',
    trust: 'official',
    hosts: ['Claude Code'],
    tags: ['GitHub', 'Official'],
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
    id: 'vercel-labs-agent-skills',
    name: 'Vercel Agent Skills',
    url: 'https://github.com/vercel-labs/agent-skills',
    group: 'repository',
    description: 'Vercel official collection of agent skills for coding, UI, React, and deployment workflows.',
    trust: 'official',
    hosts: ['Codex', 'Claude Code', 'Cursor'],
    tags: ['GitHub', 'Popular'],
  },
  {
    id: 'firebase-agent-skills',
    name: 'Firebase Agent Skills',
    url: 'https://github.com/firebase/agent-skills',
    group: 'repository',
    description: 'Firebase-maintained Agent Skills for Firebase development workflows.',
    trust: 'official',
    hosts: ['Codex', 'Claude Code', 'Gemini CLI'],
    tags: ['GitHub', 'Firebase'],
  },
  {
    id: 'daymade-claude-code-skills',
    name: 'daymade Claude Code Skills',
    url: 'https://github.com/daymade/claude-code-skills',
    group: 'repository',
    description: 'Community Claude Code skills marketplace with development workflow skills.',
    trust: 'community',
    hosts: ['Claude Code'],
    tags: ['GitHub', 'Marketplace'],
  },
  {
    id: 'secondsky-claude-skills',
    name: 'SecondSky Claude Skills',
    url: 'https://github.com/secondsky/claude-skills',
    group: 'repository',
    description: 'Production-oriented Claude Code skills for Cloudflare, React, Tailwind, and AI integrations.',
    trust: 'community',
    hosts: ['Claude Code'],
    tags: ['GitHub', 'Production'],
  },
  {
    id: 'skillcreatorai-awesome-agent-skills',
    name: 'Awesome Agent Skills',
    url: 'https://github.com/skillcreatorai/Awesome-Agent-Skills',
    group: 'repository',
    description: 'Curated list of Claude Skills, resources, and tools for custom AI workflows.',
    trust: 'community',
    hosts: ['Claude Code'],
    tags: ['Awesome List'],
  },
  {
    id: 'awesome-agent-skills',
    name: 'VoltAgent Awesome Agent Skills',
    url: 'https://github.com/VoltAgent/awesome-agent-skills',
    group: 'repository',
    description: 'Large curated collection of agent skills from official teams and the community.',
    trust: 'community',
    hosts: ['Codex', 'Claude Code', 'Cursor', 'Gemini CLI'],
    tags: ['Awesome List', 'Popular'],
  },
  {
    id: 'kodustech-awesome-agent-skills',
    url: 'https://github.com/kodustech/awesome-agent-skills',
    group: 'repository',
    description: 'Curated list of Agent Skills for Claude Code, Codex, and Cursor.',
    trust: 'community',
    hosts: ['Codex', 'Claude Code', 'Cursor'],
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
    .replace(/[-_]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
