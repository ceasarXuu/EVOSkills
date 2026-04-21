import { describe, expect, it } from 'vitest';

function createDeps() {
  return {
    escHtml: (value: unknown) => String(value),
    t: (key: string) => key,
  };
}

function createPanelInput(overrides: Record<string, unknown> = {}) {
  return {
    deps: createDeps(),
    connectivityHtml: '<div>connectivity</div>',
    llmSafety: {
      enabled: true,
      windowMs: 60000,
      maxRequestsPerWindow: 12,
      maxConcurrentRequests: 2,
      maxEstimatedTokensPerWindow: 48000,
    },
    loading: false,
    loadError: '',
    promptDefaults: {
      skillCallAnalyzer: 'builtin analyzer',
      decisionExplainer: 'builtin explainer',
      readinessProbe: 'builtin probe',
    },
    promptOverrides: {
      skillCallAnalyzer: 'custom analyzer prompt',
      decisionExplainer: 'custom decision prompt',
      readinessProbe: 'custom probe prompt',
    },
    promptSources: {
      skillCallAnalyzer: 'built_in',
      decisionExplainer: 'custom',
      readinessProbe: 'built_in',
    },
    providerCatalogError: '',
    providerCatalogLoading: false,
    rowsHtml: '<div class="provider-row">provider row</div>',
    saveHint: '',
    ...overrides,
  };
}

describe('dashboard config panel', () => {
  it('renders config banners and the provider editor shell', async () => {
    const { renderDashboardConfigPanel } = await import('../../src/dashboard/web/panels/config-panel.js');

    const html = renderDashboardConfigPanel(createPanelInput({
      loading: true,
      loadError: 'load failed',
      providerCatalogError: 'catalog failed',
      providerCatalogLoading: true,
      saveHint: 'Saved',
    }));

    expect(html).toContain('configCatalogLoading');
    expect(html).toContain('configCatalogErrorPrefix');
    expect(html).toContain('catalog failed');
    expect(html).toContain('configLoading');
    expect(html).toContain('configLoadErrorPrefix');
    expect(html).toContain('<div class="provider-row">provider row</div>');
    expect(html).toContain('<div>connectivity</div>');
    expect(html).toContain('Saved');
    expect(html).not.toContain('configIntro');
  });

  it('renders prompt override editors in the evolution strategy subtab', async () => {
    const { renderDashboardConfigPanel } = await import('../../src/dashboard/web/panels/config-panel.js');

    const html = renderDashboardConfigPanel(createPanelInput({
      connectivityHtml: '',
      llmSafety: {
        enabled: false,
        windowMs: 120000,
        maxRequestsPerWindow: 20,
        maxConcurrentRequests: 4,
        maxEstimatedTokensPerWindow: 96000,
      },
      promptSources: {
        skillCallAnalyzer: 'built_in',
        decisionExplainer: 'custom',
        readinessProbe: 'custom',
      },
      rowsHtml: '<div class="config-help">configNoProviders</div>',
      selectedConfigSubTab: 'evolution',
    }));

    expect(html).not.toContain('id="cfg_llm_safety_enabled" type="checkbox"');
    expect(html).toContain('class="config-prompt-grid"');
    expect(html).toContain('id="cfg_prompt_skill_call_analyzer_source_built_in"');
    expect(html).toContain('id="cfg_prompt_skill_call_analyzer_source_custom"');
    expect(html).toContain('builtin analyzer');
    expect(html).toContain('id="cfg_prompt_skill_call_analyzer"');
    expect(html).toContain('custom analyzer prompt');
    expect(html).toContain('id="cfg_prompt_decision_explainer_source_custom"');
    expect(html).toContain('checked');
    expect(html).toContain('id="cfg_prompt_decision_explainer"');
    expect(html).toContain('custom decision prompt');
    expect(html).toContain('id="cfg_prompt_readiness_probe"');
    expect(html).toContain('custom probe prompt');
  });

  it('separates model provider controls from evolution strategy prompt controls', async () => {
    const { renderDashboardConfigPanel } = await import('../../src/dashboard/web/panels/config-panel.js');

    const modelHtml = renderDashboardConfigPanel(createPanelInput({ selectedConfigSubTab: 'model' }));
    expect(modelHtml).toContain('role="tablist"');
    expect(modelHtml).toContain("selectConfigSubTab('model')");
    expect(modelHtml).toContain('configSubTabModel');
    expect(modelHtml).toContain('configSubTabEvolutionStrategy');
    expect(modelHtml).toContain('id="cfg_providers_rows"');
    expect(modelHtml).toContain('id="cfg_llm_safety_enabled" type="checkbox"');
    expect(modelHtml).not.toContain('id="cfg_prompt_skill_call_analyzer"');

    const evolutionHtml = renderDashboardConfigPanel(createPanelInput({ selectedConfigSubTab: 'evolution' }));
    expect(evolutionHtml).toContain('role="tablist"');
    expect(evolutionHtml).toContain("selectConfigSubTab('evolution')");
    expect(evolutionHtml).toContain('class="config-subtab active"');
    expect(evolutionHtml).toContain('id="cfg_prompt_skill_call_analyzer"');
    expect(evolutionHtml).toContain('custom analyzer prompt');
    expect(evolutionHtml).not.toContain('id="cfg_providers_rows"');
    expect(evolutionHtml).not.toContain('id="cfg_llm_safety_enabled" type="checkbox"');
  });
});
