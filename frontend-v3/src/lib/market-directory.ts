export type MarketEntryGroup = 'directory' | 'repository'
export type MarketEntryTrust = 'official' | 'community' | 'index'
export type MarketLanguage = 'en' | 'zh'
export type LocalizedText = string | Partial<Record<MarketLanguage, string>>

export interface MarketEntryConfig {
  id: string
  url: string
  group: MarketEntryGroup
  name?: string
  description?: LocalizedText
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
  displayDescription: string
  displayTags: string[]
  resolvedIconUrl: string
  initials: string
}

export const MARKET_ENTRY_CONFIGS: MarketEntryConfig[] = [
  {
    id: 'skills-sh',
    url: 'https://skills.sh/',
    group: 'directory',
    description: {
      en: 'Agent Skills directory for browsing popular skill collections.',
      zh: 'Agent Skills 目录，用于浏览热门 skill 集合。',
    },
    trust: 'community',
    hosts: ['Codex', 'Claude Code', 'Cursor'],
    tags: ['Directory', 'Discovery'],
  },
  {
    id: 'findskills',
    name: 'FindSkills',
    url: 'https://findskills.org/',
    group: 'directory',
    description: {
      en: 'Searchable directory for Claude, Codex, OpenClaw, and other agent skills.',
      zh: '面向 Claude、Codex、OpenClaw 等宿主的可搜索 skills 目录。',
    },
    trust: 'community',
    hosts: ['Codex', 'Claude Code', 'OpenClaw'],
    tags: ['Directory', 'CLI'],
  },
  {
    id: 'skillsmp',
    name: 'SkillsMP',
    url: 'https://skillsmp.com/',
    group: 'directory',
    description: {
      en: 'Open marketplace for Agent Skills across Claude Code, Codex, and AI coding tools.',
      zh: '面向 Claude Code、Codex 和 AI coding 工具的开放 skills 市场。',
    },
    trust: 'community',
    hosts: ['Codex', 'Claude Code'],
    tags: ['Marketplace', 'SKILL.md'],
  },
  {
    id: 'agent-skill-sh',
    name: 'AgentSkill.sh',
    url: 'https://agentskill.sh/',
    group: 'directory',
    description: {
      en: 'Large-scale agent skills index with source, quality, and security metadata.',
      zh: '大规模 agent skills 索引，包含来源、质量和安全相关信息。',
    },
    trust: 'index',
    hosts: ['Claude Code', 'Cursor', 'OpenClaw'],
    tags: ['Index', 'Signals'],
  },
  {
    id: 'findskill-top',
    name: 'FindSkill.top',
    url: 'https://findskill.top/en/',
    group: 'directory',
    description: {
      en: 'Large AI agent skills directory covering Claude Code, Cursor, Copilot, Windsurf, and more.',
      zh: '覆盖 Claude Code、Cursor、Copilot、Windsurf 等工具的大型 skills 目录。',
    },
    trust: 'index',
    hosts: ['Claude Code', 'Cursor', 'Copilot'],
    tags: ['Directory', 'Large Index'],
  },
  {
    id: 'agensi',
    name: 'Agensi',
    url: 'https://www.agensi.io/skills',
    group: 'directory',
    description: {
      en: 'Curated SKILL.md marketplace with free and paid skills for agent workflows.',
      zh: '整理 SKILL.md 资源的市场，包含免费和付费 skills。',
    },
    trust: 'community',
    hosts: ['Codex', 'Claude Code', 'Cursor', 'Gemini CLI'],
    tags: ['Marketplace', 'Paid Skills'],
  },
  {
    id: 'skill-broker',
    name: 'skill.broker',
    url: 'https://skill.broker/',
    group: 'directory',
    description: {
      en: 'Marketplace focused on buying and selling verified SKILL.md files.',
      zh: '围绕已验证 SKILL.md 文件买卖的市场入口。',
    },
    trust: 'index',
    hosts: ['Claude Code', 'Codex'],
    tags: ['Marketplace', 'Verified'],
  },
  {
    id: 'openai-skills',
    name: 'OpenAI Skills',
    url: 'https://github.com/openai/skills',
    group: 'repository',
    description: {
      en: 'Skills catalog for Codex and Agent Skills-compatible workflows.',
      zh: 'Codex 与 Agent Skills 兼容工作流的 skills catalog。',
    },
    trust: 'official',
    hosts: ['Codex'],
    tags: ['GitHub', 'Catalog'],
  },
  {
    id: 'anthropic-skills',
    name: 'Anthropic Skills',
    url: 'https://github.com/anthropics/skills',
    group: 'repository',
    description: {
      en: 'Anthropic Agent Skills implementation, examples, and specification-adjacent resources.',
      zh: 'Anthropic Agent Skills 的实现、示例和规范相关资源。',
    },
    trust: 'official',
    hosts: ['Claude Code'],
    tags: ['GitHub', 'Spec'],
  },
  {
    id: 'anthropic-claude-plugins-official',
    name: 'Anthropic Claude Plugins',
    url: 'https://github.com/anthropics/claude-plugins-official',
    group: 'repository',
    description: {
      en: 'Anthropic-managed Claude Code plugin directory with skill-related plugin examples.',
      zh: 'Anthropic 维护的 Claude Code plugin 目录，包含与 skill 相关的示例。',
    },
    trust: 'official',
    hosts: ['Claude Code'],
    tags: ['GitHub', 'Official'],
  },
  {
    id: 'vercel-labs-skills',
    name: 'Vercel Labs Skills',
    url: 'https://github.com/vercel-labs/skills',
    group: 'repository',
    description: {
      en: 'Agent skills tooling and Vercel Labs skill distribution entrypoint.',
      zh: 'Vercel Labs 的 agent skills 工具和分发入口。',
    },
    trust: 'official',
    hosts: ['Codex', 'Claude Code'],
    tags: ['GitHub', 'Tooling'],
  },
  {
    id: 'vercel-labs-agent-skills',
    name: 'Vercel Agent Skills',
    url: 'https://github.com/vercel-labs/agent-skills',
    group: 'repository',
    description: {
      en: 'Vercel official collection of agent skills for coding, UI, React, and deployment workflows.',
      zh: 'Vercel 官方 agent skills 集合，覆盖 coding、UI、React 和部署流程。',
    },
    trust: 'official',
    hosts: ['Codex', 'Claude Code', 'Cursor'],
    tags: ['GitHub', 'Popular'],
  },
  {
    id: 'firebase-agent-skills',
    name: 'Firebase Agent Skills',
    url: 'https://github.com/firebase/agent-skills',
    group: 'repository',
    description: {
      en: 'Firebase-maintained Agent Skills for Firebase development workflows.',
      zh: 'Firebase 维护的 Agent Skills，面向 Firebase 开发工作流。',
    },
    trust: 'official',
    hosts: ['Codex', 'Claude Code', 'Gemini CLI'],
    tags: ['GitHub', 'Firebase'],
  },
  {
    id: 'daymade-claude-code-skills',
    name: 'daymade Claude Code Skills',
    url: 'https://github.com/daymade/claude-code-skills',
    group: 'repository',
    description: {
      en: 'Community Claude Code skills marketplace with development workflow skills.',
      zh: '社区维护的 Claude Code skills 市场，偏开发工作流。',
    },
    trust: 'community',
    hosts: ['Claude Code'],
    tags: ['GitHub', 'Marketplace'],
  },
  {
    id: 'secondsky-claude-skills',
    name: 'SecondSky Claude Skills',
    url: 'https://github.com/secondsky/claude-skills',
    group: 'repository',
    description: {
      en: 'Production-oriented Claude Code skills for Cloudflare, React, Tailwind, and AI integrations.',
      zh: '偏生产实践的 Claude Code skills，覆盖 Cloudflare、React、Tailwind 和 AI 集成。',
    },
    trust: 'community',
    hosts: ['Claude Code'],
    tags: ['GitHub', 'Production'],
  },
  {
    id: 'skillcreatorai-awesome-agent-skills',
    name: 'Awesome Agent Skills',
    url: 'https://github.com/skillcreatorai/Awesome-Agent-Skills',
    group: 'repository',
    description: {
      en: 'Curated list of Claude Skills, resources, and tools for custom AI workflows.',
      zh: '整理 Claude Skills、资源和工具的社区列表。',
    },
    trust: 'community',
    hosts: ['Claude Code'],
    tags: ['Awesome List'],
  },
  {
    id: 'awesome-agent-skills',
    name: 'VoltAgent Awesome Agent Skills',
    url: 'https://github.com/VoltAgent/awesome-agent-skills',
    group: 'repository',
    description: {
      en: 'Large curated collection of agent skills from official teams and the community.',
      zh: '大型 curated agent skills 集合，来源包括官方团队和社区。',
    },
    trust: 'community',
    hosts: ['Codex', 'Claude Code', 'Cursor', 'Gemini CLI'],
    tags: ['Awesome List', 'Popular'],
  },
  {
    id: 'kodustech-awesome-agent-skills',
    url: 'https://github.com/kodustech/awesome-agent-skills',
    group: 'repository',
    description: {
      en: 'Curated list of Agent Skills for Claude Code, Codex, and Cursor.',
      zh: '面向 Claude Code、Codex 和 Cursor 的 Agent Skills 列表。',
    },
    trust: 'community',
    hosts: ['Codex', 'Claude Code', 'Cursor'],
    tags: ['Awesome List'],
  },
]

export function resolveMarketEntries(
  configs: MarketEntryConfig[] = MARKET_ENTRY_CONFIGS,
  lang: MarketLanguage = 'en',
): MarketEntry[] {
  return configs.map((config) => resolveMarketEntry(config, lang))
}

export function resolveMarketEntry(config: MarketEntryConfig, lang: MarketLanguage = 'en'): MarketEntry {
  const parsedUrl = new URL(config.url)
  const displayHost = parsedUrl.hostname.replace(/^www\./, '')
  const displayName = config.name || inferNameFromUrl(parsedUrl)

  return {
    ...config,
    displayHost,
    displayName,
    displayUrl: `${displayHost}${parsedUrl.pathname === '/' ? '' : parsedUrl.pathname.replace(/\/$/, '')}`,
    displayDescription: resolveLocalizedText(config.description, lang),
    displayTags: (config.tags ?? []).map((tag) => localizeMarketTag(tag, lang)),
    resolvedIconUrl: config.iconUrl || resolveFaviconUrl(parsedUrl),
    initials: buildInitials(displayName),
  }
}

export function resolveLocalizedText(value: LocalizedText | undefined, lang: MarketLanguage): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[lang] || value.en || value.zh || ''
}

export function localizeMarketTag(tag: string, lang: MarketLanguage): string {
  if (lang === 'en') return tag
  return MARKET_TAG_ZH[tag] || tag
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

const MARKET_TAG_ZH: Record<string, string> = {
  Catalog: '目录',
  CLI: 'CLI',
  Directory: '目录',
  Discovery: '发现',
  Firebase: 'Firebase',
  GitHub: 'GitHub',
  Index: '索引',
  'Large Index': '大型索引',
  Marketplace: '市场',
  Official: '官方',
  'Awesome List': '精选列表',
  'Paid Skills': '付费 Skills',
  Popular: '热门',
  Production: '生产实践',
  Signals: '信号',
  'SKILL.md': 'SKILL.md',
  Spec: '规范',
  Tooling: '工具',
  Verified: '已验证',
}
