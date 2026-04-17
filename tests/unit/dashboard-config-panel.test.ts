import { describe, expect, it } from 'vitest';

function createDeps() {
  return {
    escHtml: (value: unknown) => String(value),
    t: (key: string) => key,
  };
}

describe('dashboard config panel', () => {
  it('renders config banners and the provider editor shell', async () => {
    const { renderDashboardConfigPanel } = await import('../../src/dashboard/web/panels/config-panel.js');

    const html = renderDashboardConfigPanel({
      deps: createDeps(),
      connectivityHtml: '<div>connectivity</div>',
      llmSafety: {
        enabled: true,
        windowMs: 60000,
        maxRequestsPerWindow: 12,
        maxConcurrentRequests: 2,
        maxEstimatedTokensPerWindow: 48000,
      },
      loading: true,
      loadError: 'load failed',
      promptOverrides: {
        skillCallAnalyzer: 'analyzer prompt',
        decisionExplainer: 'decision prompt',
        readinessProbe: 'probe prompt',
      },
      providerCatalogError: 'catalog failed',
      providerCatalogLoading: true,
      rowsHtml: '<div class="provider-row">provider row</div>',
      saveHint: 'Saved',
    });

    expect(html).toContain('configCatalogLoading');
    expect(html).toContain('configCatalogErrorPrefix');
    expect(html).toContain('catalog failed');
    expect(html).toContain('configLoading');
    expect(html).toContain('configLoadErrorPrefix');
    expect(html).toContain('<div class="provider-row">provider row</div>');
    expect(html).toContain('<div>connectivity</div>');
    expect(html).toContain('Saved');
  });

  it('renders prompt override editors and llm safety controls', async () => {
    const { renderDashboardConfigPanel } = await import('../../src/dashboard/web/panels/config-panel.js');

    const html = renderDashboardConfigPanel({
      deps: createDeps(),
      connectivityHtml: '',
      llmSafety: {
        enabled: false,
        windowMs: 120000,
        maxRequestsPerWindow: 20,
        maxConcurrentRequests: 4,
        maxEstimatedTokensPerWindow: 96000,
      },
      loading: false,
      loadError: '',
      promptOverrides: {
        skillCallAnalyzer: 'analyzer prompt',
        decisionExplainer: 'decision prompt',
        readinessProbe: 'probe prompt',
      },
      providerCatalogError: '',
      providerCatalogLoading: false,
      rowsHtml: '<div class="config-help">configNoProviders</div>',
      saveHint: '',
    });

    expect(html).toContain('id="cfg_llm_safety_enabled" type="checkbox"');
    expect(html).not.toContain('id="cfg_llm_safety_enabled" type="checkbox" checked');
    expect(html).toContain('id="cfg_prompt_skill_call_analyzer"');
    expect(html).toContain('analyzer prompt');
    expect(html).toContain('id="cfg_prompt_decision_explainer"');
    expect(html).toContain('decision prompt');
    expect(html).toContain('id="cfg_prompt_readiness_probe"');
    expect(html).toContain('probe prompt');
  });
});
