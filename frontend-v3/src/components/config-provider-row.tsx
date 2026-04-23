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
  DashboardProviderCatalogEntry,
  DashboardProviderConfig,
  DashboardProviderHealthResult,
} from '@/types/config'

export interface ConfigProviderRowProps {
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
}

export function ConfigProviderRow({
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
}: ConfigProviderRowProps) {
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
                  apiKeyEnvVar: provider.apiKeyEnvVar || '',
                  provider: '',
                })
                return
              }

              const catalogEntry = getProviderCatalogEntry(providerCatalog, value)
              onUpdate(index, {
                apiKeyEnvVar: catalogEntry?.apiKeyEnvVar || guessApiKeyEnvVar(value),
                provider: value,
              })
            }}
            value={providerSelectValue}
          >
            <SelectTrigger aria-label="选择 provider" className="w-full">
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
            <SelectTrigger aria-label="选择 model" className="w-full">
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
              aria-label="粘贴 API Key"
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
              aria-label={isApiKeyVisible ? CONFIG_TEXT.apiKeyHide : CONFIG_TEXT.apiKeyShow}
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
