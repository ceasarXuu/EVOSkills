import { ConfigPromptEditor } from '@/components/config-prompt-editor'
import {
  getConfigText,
  getPromptDefaults,
} from '@/lib/config-workspace'
import { useI18n } from '@/lib/i18n'
import type { DashboardConfig, DashboardPromptKey, DashboardPromptSource } from '@/types/config'

interface ConfigGovernancePanelProps {
  config: DashboardConfig
  onSetPromptOverride: (key: DashboardPromptKey, value: string) => void
  onSetPromptSource: (key: DashboardPromptKey, value: DashboardPromptSource) => void
}

export function ConfigGovernancePanel({
  config,
  onSetPromptOverride,
  onSetPromptSource,
}: ConfigGovernancePanelProps) {
  const { lang } = useI18n()
  const configText = getConfigText(lang)
  const defaults = getPromptDefaults()
  const promptFields: Array<{
    key: DashboardPromptKey
    label: string
    placeholder: string
  }> = [
    {
      key: 'skillCallAnalyzer',
      label: configText.promptSkillCallAnalyzerLabel,
      placeholder: configText.promptSkillCallAnalyzerPlaceholder,
    },
    {
      key: 'decisionExplainer',
      label: configText.promptDecisionExplainerLabel,
      placeholder: configText.promptDecisionExplainerPlaceholder,
    },
    {
      key: 'readinessProbe',
      label: configText.promptReadinessProbeLabel,
      placeholder: configText.promptReadinessProbePlaceholder,
    },
  ]

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{configText.promptLabel}</p>
        <p className="text-sm text-muted-foreground">{configText.promptHelp}</p>
      </div>

      <div className="space-y-4">
        {promptFields.map((field) => (
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
