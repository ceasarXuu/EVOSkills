import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  CONFIG_TEXT,
  getConnectivityProviders,
  guessApiKeyEnvVar,
  isKnownModel,
  isKnownProvider,
} from '@/lib/config-workspace'
import { getProviderCatalogEntry, getProviderDisplayName, getProviderModelOptions } from '@/lib/dashboard-config'
import type {
  DashboardConfig,
  DashboardProviderCatalogEntry,
  DashboardProviderConfig,
  DashboardProviderHealthResult,
} from '@/types/config'

interface ConfigProviderStackProps {
  apiKeyVisibilityByRow: Record<string, boolean>
  config: DashboardConfig
  connectivityResults: DashboardProviderHealthResult[]
  isCatalogLoading: boolean
  isCheckingConnectivity: boolean
  onAddProvider: () => void
  onCheckConnectivity: (rowIndex?: number | null) => void | Promise<void>
  onRemoveProvider: (index: number) => void
  onSetDefaultProvider: (value: string) => void
  onSetSafetyField: (field: keyof DashboardConfig['llmSafety'], value: boolean | number) => void
  onToggleApiKeyVisibility: (index: number) => void
  onUpdateProvider: (index: number, patch: Partial<DashboardProviderConfig>) => void
  providerCatalog: DashboardProviderCatalogEntry[]
}

export function ConfigProviderStack({
  apiKeyVisibilityByRow,
  config,
  connectivityResults,
  isCatalogLoading,
  isCheckingConnectivity,
  onAddProvider,
  onCheckConnectivity,
  onRemoveProvider,
  onSetDefaultProvider,
  onSetSafetyField,
  onToggleApiKeyVisibility,
  onUpdateProvider,
  providerCatalog,
}: ConfigProviderStackProps) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{CONFIG_TEXT.providersLabel}</p>
          <p className="text-sm text-muted-foreground">{CONFIG_TEXT.providersHelp}</p>
        </div>

        {isCatalogLoading ? (
          <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            {CONFIG_TEXT.catalogLoading}
          </div>
        ) : null}

        {config.providers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
            {CONFIG_TEXT.noProviders}
          </div>
        ) : (
          <div className="space-y-4" id="cfg_providers_rows">
            {config.providers.map((provider, index) => (
              <ProviderRow
                index={index}
                isApiKeyVisible={Boolean(apiKeyVisibilityByRow[String(index)])}
                isCheckingConnectivity={isCheckingConnectivity}
                key={`${provider.provider}:${provider.modelName}:${index}`}
                onCheckConnectivity={onCheckConnectivity}
                onRemove={onRemoveProvider}
                onSetDefaultProvider={onSetDefaultProvider}
                onToggleApiKeyVisibility={onToggleApiKeyVisibility}
                onUpdate={onUpdateProvider}
                provider={provider}
                providerCatalog={providerCatalog}
                result={findConnectivityResult(connectivityResults, provider)}
                selectedDefaultProvider={config.defaultProvider}
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={onAddProvider} type="button" variant="secondary">
            {CONFIG_TEXT.addProvider}
          </Button>
        </div>

        <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
          <p className="text-sm font-medium text-foreground">{CONFIG_TEXT.connectivityTitle}</p>
          {connectivityResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">{CONFIG_TEXT.connectivityEmpty}</p>
          ) : (
            <div className="space-y-2">
              {connectivityResults.map((result) => (
                <div className="text-sm text-muted-foreground" key={`${result.provider}:${result.modelName}`}>
                  <span className={result.ok ? 'text-emerald-500' : 'text-destructive'}>
                    [{result.ok ? 'OK' : 'FAIL'}]
                  </span>{' '}
                  {result.provider} / {result.modelName} ({result.durationMs}ms)
                  <div>{result.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{CONFIG_TEXT.llmSafetyLabel}</p>
          <p className="text-sm text-muted-foreground">{CONFIG_TEXT.llmSafetyHelp}</p>
        </div>

        <div className="grid gap-4 rounded-lg border border-border/70 bg-muted/20 p-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="flex items-start gap-3 rounded-md border border-border/60 bg-background/50 px-3 py-2 text-sm">
            <input
              checked={config.llmSafety.enabled}
              className="mt-1"
              onChange={(event) => onSetSafetyField('enabled', event.target.checked)}
              type="checkbox"
            />
            <span>{CONFIG_TEXT.llmSafetyEnabled}</span>
          </label>

          <NumericField
            label={CONFIG_TEXT.llmSafetyWindow}
            onChange={(value) => onSetSafetyField('windowMs', value)}
            value={config.llmSafety.windowMs}
          />
          <NumericField
            label={CONFIG_TEXT.llmSafetyRequests}
            onChange={(value) => onSetSafetyField('maxRequestsPerWindow', value)}
            value={config.llmSafety.maxRequestsPerWindow}
          />
          <NumericField
            label={CONFIG_TEXT.llmSafetyConcurrent}
            onChange={(value) => onSetSafetyField('maxConcurrentRequests', value)}
            value={config.llmSafety.maxConcurrentRequests}
          />
          <NumericField
            label={CONFIG_TEXT.llmSafetyTokens}
            onChange={(value) => onSetSafetyField('maxEstimatedTokensPerWindow', value)}
            value={config.llmSafety.maxEstimatedTokensPerWindow}
          />
        </div>
      </section>
    </div>
  )
}

function ProviderRow({
  index,
  isApiKeyVisible,
  isCheckingConnectivity,
  onCheckConnectivity,
  onRemove,
  onSetDefaultProvider,
  onToggleApiKeyVisibility,
  onUpdate,
  provider,
  providerCatalog,
  result,
  selectedDefaultProvider,
}: {
  index: number
  isApiKeyVisible: boolean
  isCheckingConnectivity: boolean
  onCheckConnectivity: (rowIndex?: number | null) => void | Promise<void>
  onRemove: (index: number) => void
  onSetDefaultProvider: (value: string) => void
  onToggleApiKeyVisibility: (index: number) => void
  onUpdate: (index: number, patch: Partial<DashboardProviderConfig>) => void
  provider: DashboardProviderConfig
  providerCatalog: DashboardProviderCatalogEntry[]
  result: DashboardProviderHealthResult | null
  selectedDefaultProvider: string
}) {
  const providerIsKnown = isKnownProvider(providerCatalog, provider.provider)
  const providerSelectValue = providerIsKnown ? provider.provider : '__custom__'
  const providerOptions = providerCatalog.length > 0 ? providerCatalog : []
  const modelOptions = getProviderModelOptions(providerCatalog, provider.provider)
  const modelIsKnown = isKnownModel(providerCatalog, provider.provider, provider.modelName)
  const modelSelectValue = modelIsKnown ? provider.modelName : '__custom__'
  const apiKeyEnvVar = provider.apiKeyEnvVar || guessApiKeyEnvVar(provider.provider)
  const isSelectedDefault =
    provider.provider.trim().length > 0 && provider.provider === selectedDefaultProvider

  return (
    <div className="space-y-4 rounded-lg border border-border/70 bg-card/70 p-4">
      <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_220px]">
        <div className="space-y-2">
          <Select
            onValueChange={(value) => {
              if (value === '__custom__') {
                onUpdate(index, {
                  provider: '',
                  apiKeyEnvVar: provider.apiKeyEnvVar || '',
                })
                return
              }

              const catalogEntry = getProviderCatalogEntry(providerCatalog, value)
              onUpdate(index, {
                provider: value,
                apiKeyEnvVar: catalogEntry?.apiKeyEnvVar || guessApiKeyEnvVar(value),
              })
            }}
            value={providerSelectValue}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={CONFIG_TEXT.catalogCustomOnly} />
            </SelectTrigger>
            <SelectContent>
              {providerOptions.length === 0 ? (
                <SelectItem value="__custom__">{CONFIG_TEXT.catalogCustomOnly}</SelectItem>
              ) : null}
              {providerOptions.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  {getProviderDisplayName(providerCatalog, entry.id)}
                </SelectItem>
              ))}
              <SelectItem value="__custom__">{CONFIG_TEXT.customOption}</SelectItem>
            </SelectContent>
          </Select>
          {!providerIsKnown ? (
            <Input
              onChange={(event) => onUpdate(index, { provider: event.target.value })}
              placeholder={CONFIG_TEXT.customProviderPlaceholder}
              value={provider.provider}
            />
          ) : null}
        </div>

        <div className="space-y-2">
          <Select
            onValueChange={(value) => {
              if (value === '__custom__') {
                onUpdate(index, { modelName: '' })
                return
              }

              onUpdate(index, { modelName: value })
            }}
            value={modelSelectValue}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={CONFIG_TEXT.customModelPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
              <SelectItem value="__custom__">{CONFIG_TEXT.customOption}</SelectItem>
            </SelectContent>
          </Select>
          {!modelIsKnown ? (
            <Input
              onChange={(event) => onUpdate(index, { modelName: event.target.value })}
              placeholder={CONFIG_TEXT.customModelPlaceholder}
              value={provider.modelName}
            />
          ) : null}
        </div>

        <div className="space-y-2">
          <Input
            onChange={(event) => onUpdate(index, { apiKeyEnvVar: event.target.value })}
            placeholder={guessApiKeyEnvVar(provider.provider)}
            value={apiKeyEnvVar}
          />
          {result ? (
            <p className="text-xs text-muted-foreground">
              [{result.ok ? 'OK' : 'FAIL'}] {result.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              onChange={(event) =>
                onUpdate(index, {
                  apiKey: event.target.value,
                  hasApiKey: event.target.value.trim().length > 0 || provider.hasApiKey,
                })
              }
              placeholder={CONFIG_TEXT.apiKeyPastePlaceholder}
              type={isApiKeyVisible ? 'text' : 'password'}
              value={provider.apiKey || ''}
            />
            <Button
              onClick={() => onToggleApiKeyVisibility(index)}
              type="button"
              variant="outline"
            >
              {isApiKeyVisible ? CONFIG_TEXT.apiKeyHide : CONFIG_TEXT.apiKeyShow}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:justify-end">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              checked={isSelectedDefault}
              name="cfg_provider_active"
              onChange={() => onSetDefaultProvider(provider.provider)}
              type="radio"
            />
            <span>{CONFIG_TEXT.providerActiveLabel}</span>
          </label>
          <Button
            disabled={getConnectivityProviders([provider], 0).length === 0 || isCheckingConnectivity}
            onClick={() => void onCheckConnectivity(index)}
            type="button"
            variant="outline"
          >
            {isCheckingConnectivity ? CONFIG_TEXT.connectivityChecking : CONFIG_TEXT.checkConnectivity}
          </Button>
          <Button onClick={() => onRemove(index)} type="button" variant="destructive">
            {CONFIG_TEXT.removeProvider}
          </Button>
        </div>
      </div>
    </div>
  )
}

function findConnectivityResult(
  results: DashboardProviderHealthResult[],
  provider: DashboardProviderConfig,
) {
  return (
    results.find(
      (result) =>
        result.provider === provider.provider && result.modelName === provider.modelName,
    ) ?? null
  )
}

function NumericField({
  label,
  onChange,
  value,
}: {
  label: string
  onChange: (value: number) => void
  value: number
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Input
        min={1}
        onChange={(event) => onChange(Number(event.target.value) || 1)}
        type="number"
        value={value}
      />
    </label>
  )
}
