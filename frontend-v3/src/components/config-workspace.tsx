import { useEffect, useState } from 'react'
import { ConfigGovernancePanel } from '@/components/config-governance-panel'
import { ConfigProviderStack } from '@/components/config-provider-stack'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { CONFIG_TEXT, normalizeConfigSubTab, type DashboardConfigSubTab } from '@/lib/config-workspace'
import { useDashboardV3Config } from '@/features/dashboard/use-dashboard-v3-config'

const CONFIG_SUBTAB_STORAGE_KEY = 'dashboard-v3.config-subtab'

function loadStoredConfigSubTab(): DashboardConfigSubTab {
  if (typeof window === 'undefined') {
    return 'model'
  }

  return normalizeConfigSubTab(window.localStorage.getItem(CONFIG_SUBTAB_STORAGE_KEY))
}

export function ConfigWorkspace() {
  const {
    addProvider,
    catalogError,
    checkConnectivity,
    config,
    connectivityResults,
    isApiKeyVisible,
    isCheckingConnectivity,
    isLoading,
    loadError,
    providerCatalog,
    reloadProviderCatalog,
    refresh,
    removeProvider,
    saveHint,
    setDefaultProvider,
    setPromptOverride,
    setPromptSource,
    setSafetyField,
    toggleApiKeyVisibility,
    updateProvider,
  } = useDashboardV3Config()
  const [selectedSubTab, setSelectedSubTab] = useState<DashboardConfigSubTab>(() =>
    loadStoredConfigSubTab(),
  )

  useEffect(() => {
    window.localStorage.setItem(CONFIG_SUBTAB_STORAGE_KEY, selectedSubTab)
  }, [selectedSubTab])

  return (
    <div className="space-y-5">
      {catalogError ? (
        <NoticeRow
          actionLabel={CONFIG_TEXT.retry}
          message={`${CONFIG_TEXT.catalogErrorPrefix} ${catalogError}`}
          onAction={() => void reloadProviderCatalog()}
          tone="danger"
        />
      ) : null}

      {isLoading ? <NoticeRow message={CONFIG_TEXT.loading} tone="muted" /> : null}

      {loadError ? (
        <NoticeRow
          actionLabel={CONFIG_TEXT.retry}
          message={`${CONFIG_TEXT.loadErrorPrefix} ${loadError}`}
          onAction={() => void refresh()}
          tone="danger"
        />
      ) : null}

      <Tabs
        onValueChange={(value) => setSelectedSubTab(normalizeConfigSubTab(value))}
        value={selectedSubTab}
      >
        <TabsList variant="line">
          <TabsTrigger value="model">{CONFIG_TEXT.modelSubTab}</TabsTrigger>
          <TabsTrigger value="evolution">{CONFIG_TEXT.evolutionSubTab}</TabsTrigger>
        </TabsList>
      </Tabs>

      {selectedSubTab === 'model' ? (
        <ConfigProviderStack
          apiKeyVisibilityByRow={config.providers.reduce<Record<string, boolean>>((acc, _, index) => {
            acc[String(index)] = isApiKeyVisible(index)
            return acc
          }, {})}
          config={config}
          connectivityResults={connectivityResults}
          isCatalogLoading={isLoading && providerCatalog.length === 0}
          isCheckingConnectivity={isCheckingConnectivity}
          onAddProvider={addProvider}
          onCheckConnectivity={checkConnectivity}
          onRemoveProvider={removeProvider}
          onSetDefaultProvider={setDefaultProvider}
          onSetSafetyField={setSafetyField}
          onToggleApiKeyVisibility={toggleApiKeyVisibility}
          onUpdateProvider={updateProvider}
          providerCatalog={providerCatalog}
        />
      ) : (
        <ConfigGovernancePanel
          config={config}
          onSetPromptOverride={setPromptOverride}
          onSetPromptSource={setPromptSource}
        />
      )}

      <div className="flex min-h-6 items-center text-sm text-muted-foreground">
        <span id="cfg_save_hint">{saveHint}</span>
      </div>
    </div>
  )
}

function NoticeRow({
  actionLabel,
  message,
  onAction,
  tone,
}: {
  actionLabel?: string
  message: string
  onAction?: () => void
  tone: 'danger' | 'muted'
}) {
  return (
    <div
      className={
        tone === 'danger'
          ? 'flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive'
          : 'rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground'
      }
    >
      <span>{message}</span>
      {actionLabel && onAction ? (
        <Button onClick={onAction} size="sm" type="button" variant="outline">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
