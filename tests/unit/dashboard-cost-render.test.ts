import { describe, expect, it } from 'vitest';

describe('dashboard cost render helpers', () => {
  it('renders capability pills from supported model detail flags', async () => {
    const { renderDashboardCapabilityPills } = await import('../../src/dashboard/web/render/cost-breakdown.js');

    const html = renderDashboardCapabilityPills({
      detail: {
        supportsReasoning: true,
        supportsFunctionCalling: true,
        supportsPromptCaching: false,
        supportsStructuredOutput: true,
        supportsVision: false,
        supportsWebSearch: true,
      },
      deps: {
        escHtml: (value: unknown) => String(value ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
        t: (key: string) => key,
      },
    });

    expect(html).toContain('costCapabilityReasoning');
    expect(html).toContain('costCapabilityFunctionCalling');
    expect(html).toContain('costCapabilityStructuredOutput');
    expect(html).toContain('costCapabilityWebSearch');
    expect(html).not.toContain('costCapabilityPromptCaching');
  });

  it('renders a cost breakdown card with formatted rows and empty fallback', async () => {
    const { renderDashboardCostBreakdown } = await import('../../src/dashboard/web/render/cost-breakdown.js');

    const html = renderDashboardCostBreakdown({
      title: 'costScopeBreakdown',
      rows: [
        {
          key: 'scope/a',
          bucket: {
            callCount: 2,
            totalTokens: 1200,
          },
        },
      ],
      emptyText: 'costEmpty',
      countLabel: 'tokens',
      formatter: (row: { key: string }) => `${row.key}:42`,
      deps: {
        escHtml: (value: unknown) => String(value ?? ''),
        formatPlainNumber: (value: unknown) => `plain:${String(value ?? '')}`,
        formatUsageCompact: (value: unknown) => `compact:${String(value ?? '')}`,
        t: (key: string) => key,
      },
    });

    expect(html).toContain('<span>costScopeBreakdown</span>');
    expect(html).toContain('scope/a');
    expect(html).toContain('scope/a:42');
    expect(html).toContain('plain:2 costTableCallsSuffix');
    expect(html).toContain('compact:1200 tokens');

    const emptyHtml = renderDashboardCostBreakdown({
      title: 'costScopeBreakdown',
      rows: [],
      emptyText: 'costEmpty',
      countLabel: 'tokens',
      formatter: () => '',
      deps: {
        escHtml: (value: unknown) => String(value ?? ''),
        formatPlainNumber: (value: unknown) => String(value ?? ''),
        formatUsageCompact: (value: unknown) => String(value ?? ''),
        t: (key: string) => key,
      },
    });

    expect(emptyHtml).toContain('<div class="empty-state">costEmpty</div>');
  });

  it('exposes cost render helper source for browser injection', async () => {
    const { renderDashboardCostBreakdownSource } = await import('../../src/dashboard/web/render/cost-breakdown.js');

    const source = renderDashboardCostBreakdownSource();
    expect(source).toContain('function renderDashboardCapabilityPills');
    expect(source).toContain('function renderDashboardCostBreakdown');
  });
});
