import { describe, expect, it, vi } from 'vitest';

type CostRow = {
  key: string;
  bucket: {
    callCount?: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    avgDurationMs?: number;
    lastCallAt?: string | null;
  };
  detail: {
    mode?: string;
    outputCostPerReasoningToken?: number;
    inputCostPerToken?: number;
    outputCostPerToken?: number;
  } | null;
  estimatedSpend: number | null;
};

function createDeps(modelRows: CostRow[] = [], scopeRows: CostRow[] = [], skillRows: CostRow[] = []) {
  const buildCostRows = vi
    .fn()
    .mockReturnValueOnce(modelRows)
    .mockReturnValueOnce(scopeRows)
    .mockReturnValueOnce(skillRows);

  return {
    buildCostRows,
    escHtml: (value: unknown) => String(value),
    formatContextWindow: () => '128K / 8K',
    formatDurationMs: (value: unknown) => `${String(value)}ms`,
    formatPlainNumber: (value: unknown) => String(value),
    formatUsd: (value: unknown) => `$${Number(value).toFixed(2)}`,
    formatUsdPerMillion: (value: unknown) => `$${(Number(value) * 1_000_000).toFixed(2)}/M`,
    formatUsageCompact: (value: unknown) => String(value),
    getLiteLLMModelDetailsIndex: () => ({}),
    renderCapabilityPills: () => '<span>caps</span>',
    renderCostBreakdown: (title: string) => `<section>${title}</section>`,
    t: (key: string) => key,
    timeAgo: (value: unknown) => `ago:${String(value)}`,
  };
}

describe('dashboard cost panel', () => {
  it('renders the empty state when no usage has been recorded', async () => {
    const { renderDashboardCostPanel } = await import('../../src/dashboard/web/panels/cost-panel.js');

    expect(
      renderDashboardCostPanel({
        deps: createDeps(),
        projectData: {},
      })
    ).toContain('<div class="empty-state">costEmpty</div>');
  });

  it('renders the richer cost shell from injected cost rows', async () => {
    const { renderDashboardCostPanel } = await import('../../src/dashboard/web/panels/cost-panel.js');

    const html = renderDashboardCostPanel({
      deps: createDeps(
        [
          {
            key: 'openai/gpt-5',
            bucket: {
              callCount: 4,
              promptTokens: 1200,
              completionTokens: 800,
              totalTokens: 2000,
              avgDurationMs: 1400,
              lastCallAt: '2026-04-17T12:00:00.000Z',
            },
            detail: {
              mode: 'responses',
              inputCostPerToken: 0.000001,
              outputCostPerToken: 0.000002,
              outputCostPerReasoningToken: 0.000003,
            },
            estimatedSpend: 1.25,
          },
        ],
        [{ key: 'scope/a', bucket: { callCount: 2, totalTokens: 1000 }, detail: null, estimatedSpend: null }],
        [{ key: 'skill/a', bucket: { callCount: 1, totalTokens: 500 }, detail: null, estimatedSpend: null }]
      ),
      projectData: {
        agentUsage: {
          callCount: 4,
          promptTokens: 1200,
          completionTokens: 800,
          totalTokens: 2000,
          avgDurationMs: 1400,
          lastCallAt: '2026-04-17T12:00:00.000Z',
          byModel: { 'openai/gpt-5': { totalTokens: 2000 } },
          byScope: { 'scope/a': { totalTokens: 1000 } },
          bySkill: { 'skill/a': { totalTokens: 500 } },
        },
      },
    });

    expect(html).toContain('class="cost-shell"');
    expect(html).toContain('class="cost-hero"');
    expect(html).toContain('openai/gpt-5');
    expect(html).toContain('responses');
    expect(html).toContain('costSignalsReasoningDetected');
    expect(html).toContain('<section>costScopeBreakdown</section>');
  });
});
