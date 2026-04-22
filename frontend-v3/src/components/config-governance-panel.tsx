import { Textarea } from '@/components/ui/textarea'
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
          <PromptEditor
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

function PromptEditor({
  defaultPrompt,
  label,
  onSetPromptOverride,
  onSetPromptSource,
  placeholder,
  promptKey,
  source,
  value,
}: {
  defaultPrompt: string
  label: string
  onSetPromptOverride: (key: DashboardPromptKey, value: string) => void
  onSetPromptSource: (key: DashboardPromptKey, value: DashboardPromptSource) => void
  placeholder: string
  promptKey: DashboardPromptKey
  source: DashboardPromptSource
  value: string
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-card/70 p-4">
      <p className="text-sm font-medium text-foreground">{label}</p>

      <div className="grid gap-4 xl:grid-cols-2">
        <label className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              checked={source !== 'custom'}
              name={`${promptKey}_source`}
              onChange={() => onSetPromptSource(promptKey, 'built_in')}
              type="radio"
            />
            <span>{CONFIG_TEXT.builtInPrompt}</span>
          </div>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-border/70 bg-muted/20 px-4 py-3 text-xs leading-6 text-muted-foreground">
            {defaultPrompt}
          </pre>
        </label>

        <label className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              checked={source === 'custom'}
              name={`${promptKey}_source`}
              onChange={() => onSetPromptSource(promptKey, 'custom')}
              type="radio"
            />
            <span>{CONFIG_TEXT.customPrompt}</span>
          </div>
          <Textarea
            className="min-h-64"
            disabled={source !== 'custom'}
            onChange={(event) => onSetPromptOverride(promptKey, event.target.value)}
            placeholder={placeholder}
            value={value}
          />
        </label>
      </div>
    </div>
  )
}
