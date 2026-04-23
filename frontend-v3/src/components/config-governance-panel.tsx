import { ConfigPromptEditor } from '@/components/config-prompt-editor'
import {
  CONFIG_TEXT,
  getPromptDefaults,
} from '@/lib/config-workspace'
import type { DashboardConfig, DashboardPromptKey, DashboardPromptSource } from '@/types/config'

interface ConfigGovernancePanelProps {
  config: DashboardConfig
  onSetPromptOverride: (key: DashboardPromptKey, value: string) => void
  onSetPromptSource: (key: DashboardPromptKey, value: DashboardPromptSource) => void
}

const PROMPT_FIELDS: Array<{
  key: DashboardPromptKey
  label: string
  placeholder: string
}> = [
  {
    key: 'skillCallAnalyzer',
    label: CONFIG_TEXT.promptSkillCallAnalyzerLabel,
    placeholder: CONFIG_TEXT.promptSkillCallAnalyzerPlaceholder,
  },
  {
    key: 'decisionExplainer',
    label: CONFIG_TEXT.promptDecisionExplainerLabel,
    placeholder: CONFIG_TEXT.promptDecisionExplainerPlaceholder,
  },
  {
    key: 'readinessProbe',
    label: CONFIG_TEXT.promptReadinessProbeLabel,
    placeholder: CONFIG_TEXT.promptReadinessProbePlaceholder,
  },
]

export function ConfigGovernancePanel({
  config,
  onSetPromptOverride,
  onSetPromptSource,
}: ConfigGovernancePanelProps) {
  const defaults = getPromptDefaults()

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{CONFIG_TEXT.promptLabel}</p>
        <p className="text-sm text-muted-foreground">{CONFIG_TEXT.promptHelp}</p>
      </div>

      <div className="space-y-4">
        {PROMPT_FIELDS.map((field) => (
          <ConfigPromptEditor
            defaultPrompt={defaults[field.key]}
            key={field.key}
            label={field.label}
            onSetPromptOverride={onSetPromptOverride}
            onSetPromptSource={onSetPromptSource}
            placeholder={field.placeholder}
            promptKey={field.key}
            source={config.promptSources[field.key]}
            value={config.promptOverrides[field.key]}
          />
        ))}
      </div>
    </section>
  )
}
