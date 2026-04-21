const DASHBOARD_CONFIG_SUBTABS_SOURCE = String.raw`function normalizeConfigSubTab(tab) {
  return tab === 'evolution' ? 'evolution' : 'model';
}

function selectConfigSubTab(tab) {
  const previousSubTab = normalizeConfigSubTab(state.selectedConfigSubTab);
  const nextSubTab = normalizeConfigSubTab(tab);
  if (previousSubTab !== nextSubTab && configAutoSaveTimer !== null) {
    clearTimeout(configAutoSaveTimer);
    configAutoSaveTimer = null;
    console.debug('[dashboard] flushing config autosave before subtab switch', {
      previousSubTab,
      nextSubTab,
      selectedProjectId: state.selectedProjectId || '',
    });
    void saveProjectConfig({ auto: true });
  }
  state.selectedConfigSubTab = nextSubTab;

  console.info('[dashboard] config subtab selected', {
    previousSubTab,
    nextSubTab,
    selectedProjectId: state.selectedProjectId || '',
  });

  if (state.selectedMainTab === 'config') {
    safeRenderMainPanel(state.selectedProjectId || '', 'selectConfigSubTab:' + nextSubTab);
  }
  if (typeof scheduleDashboardBootstrapCacheSave === 'function') {
    scheduleDashboardBootstrapCacheSave('selectConfigSubTab');
  }
}

const baseCollectProvidersFromConfigEditorForConfigSubTabs = collectProvidersFromConfigEditor;
collectProvidersFromConfigEditor = function() {
  if (normalizeConfigSubTab(state.selectedConfigSubTab) !== 'model') {
    const config = state.selectedProjectId ? getStoredConfig(state.selectedProjectId) : null;
    return sanitizeProvidersForState(config && config.providers);
  }
  return baseCollectProvidersFromConfigEditorForConfigSubTabs();
};

const baseCollectLLMSafetyFromConfigEditorForConfigSubTabs = collectLLMSafetyFromConfigEditor;
collectLLMSafetyFromConfigEditor = function(fallbackSafety) {
  if (normalizeConfigSubTab(state.selectedConfigSubTab) !== 'model') {
    return sanitizeLLMSafetyForState(fallbackSafety);
  }
  return baseCollectLLMSafetyFromConfigEditorForConfigSubTabs(fallbackSafety);
};

const baseCollectPromptSourcesFromConfigEditorForConfigSubTabs = collectPromptSourcesFromConfigEditor;
collectPromptSourcesFromConfigEditor = function(fallbackPromptSources) {
  if (normalizeConfigSubTab(state.selectedConfigSubTab) !== 'evolution') {
    return sanitizePromptSourcesForState(fallbackPromptSources);
  }
  return baseCollectPromptSourcesFromConfigEditorForConfigSubTabs(fallbackPromptSources);
};

const baseCollectPromptOverridesFromConfigEditorForConfigSubTabs = collectPromptOverridesFromConfigEditor;
collectPromptOverridesFromConfigEditor = function(fallbackPromptOverrides) {
  if (normalizeConfigSubTab(state.selectedConfigSubTab) !== 'evolution') {
    return sanitizePromptOverridesForState(fallbackPromptOverrides);
  }
  return baseCollectPromptOverridesFromConfigEditorForConfigSubTabs(fallbackPromptOverrides);
};

const baseGetSelectedProviderIndexFromEditorForConfigSubTabs = getSelectedProviderIndexFromEditor;
getSelectedProviderIndexFromEditor = function(providerCount, fallbackDefaultProvider, providers) {
  if (normalizeConfigSubTab(state.selectedConfigSubTab) !== 'model') {
    return getActiveProviderIndex(fallbackDefaultProvider, providers);
  }
  return baseGetSelectedProviderIndexFromEditorForConfigSubTabs(
    providerCount,
    fallbackDefaultProvider,
    providers
  );
};

renderConfigPanel = function(projectPath) {
  const selectedConfigSubTab = normalizeConfigSubTab(state.selectedConfigSubTab);
  state.selectedConfigSubTab = selectedConfigSubTab;
  const config = getStoredConfig(projectPath) || {
    autoOptimize: true,
    userConfirm: false,
    runtimeSync: true,
    llmSafety: DEFAULT_LLM_SAFETY_CONFIG,
    promptSources: DEFAULT_PROMPT_SOURCES,
    promptOverrides: DEFAULT_PROMPT_OVERRIDES,
    defaultProvider: '',
    logLevel: 'info',
    providers: [],
  };
  const loading = getStoredConfigLoading(projectPath);
  const loadError = getStoredConfigLoadError(projectPath);
  const configUi = getStoredConfigUi(projectPath);

  const providers = Array.isArray(config.providers) ? config.providers : [];
  const llmSafety = sanitizeLLMSafetyForState(config.llmSafety);
  const promptDefaults = getRuntimePromptDefaults();
  const promptSources = sanitizePromptSourcesForState(config.promptSources);
  const promptOverrides = sanitizePromptOverridesForState(config.promptOverrides);
  const activeProviderIndex = getActiveProviderIndex(config.defaultProvider, providers);
  const rowsHtml = providers.length > 0
    ? providers.map(function(row, index) {
        return renderProviderRow(projectPath, row, index, activeProviderIndex);
      }).join('')
    : '<div class="config-help">' + t('configNoProviders') + '</div>';

  return renderDashboardConfigPanel({
    deps: {
      escHtml,
      t,
    },
    connectivityHtml: renderConnectivityResultsHtml(configUi.connectivityResults),
    llmSafety,
    loading,
    loadError,
    promptDefaults,
    promptSources,
    promptOverrides,
    providerCatalogError: state.providerCatalogError,
    providerCatalogLoading: state.providerCatalogLoading,
    rowsHtml,
    saveHint: configUi.saveHint || '',
    selectedConfigSubTab,
  });
};`;

export function renderDashboardConfigSubtabsSource(): string {
  return DASHBOARD_CONFIG_SUBTABS_SOURCE;
}
