import { describe, expect, it } from 'vitest';

describe('dashboard skill card render', () => {
  it('renders highlighted skill cards with runtime, versions, and confidence metadata', async () => {
    const { renderDashboardSkillCard } = await import('../../src/dashboard/web/render/skill-card.js');

    const html = renderDashboardSkillCard({
      skill: {
        skillId: 'test-driven-development',
        status: 'optimized',
        runtime: 'claude',
        traceCount: 12,
        effectiveVersion: 4,
        versionsAvailable: [{ version: 3 }, { version: 4 }],
        analysisResult: { confidence: 0.86 },
        updatedAt: '2026-04-17T12:00:00.000Z',
      },
      projectPath: '/tmp/ornn-project',
      searchQuery: 'driven',
      deps: {
        escHtml: (value: unknown) => String(value ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
        escJsStr: (value: unknown) => JSON.stringify(String(value ?? '')).slice(1, -1),
        highlightText: (text: string, query: string) => {
          const index = text.indexOf(query);
          if (index < 0) return text;
          return text.slice(0, index) + '<mark>' + query + '</mark>' + text.slice(index + query.length);
        },
        maxVersion: () => 9,
        t: (key: string) => key,
        timeAgo: () => 'just now',
      },
    });

    expect(html).toContain('class="skill-card"');
    expect(html).toContain('status-badge status-optimized');
    expect(html).toContain('<mark>driven</mark>');
    expect(html).toContain('skillHistory');
    expect(html).toContain('v4');
    expect(html).toContain('<span>claude</span>');
    expect(html).toContain('12 skillTraces');
    expect(html).toContain('skillConfidence: 86%');
    expect(html).toContain('just now');
  });

  it('renders localized empty states for both base and search cases', async () => {
    const { renderDashboardSkillsEmptyState } = await import('../../src/dashboard/web/render/skill-card.js');

    expect(
      renderDashboardSkillsEmptyState({
        searchQuery: '',
        deps: {
          escHtml: (value: unknown) => String(value ?? ''),
          t: (key: string) => key,
        },
      })
    ).toContain('skillsEmpty');

    expect(
      renderDashboardSkillsEmptyState({
        searchQuery: 'missing skill',
        deps: {
          escHtml: (value: unknown) => String(value ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
          t: (key: string) => key,
        },
      })
    ).toContain('skillsSearchEmptyPrefix "missing skill"');
  });

  it('exposes render function source for browser injection', async () => {
    const { renderDashboardSkillCardSource } = await import('../../src/dashboard/web/render/skill-card.js');

    const source = renderDashboardSkillCardSource();
    expect(source).toContain('function renderDashboardSkillCard');
    expect(source).toContain('function renderDashboardSkillsEmptyState');
  });
});
