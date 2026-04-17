import { describe, expect, it } from 'vitest';

describe('dashboard activity render helpers', () => {
  it('renders business event rows with activity actions and fallbacks', async () => {
    const { renderDashboardBusinessEvents } = await import('../../src/dashboard/web/render/activity-tables.js');

    const html = renderDashboardBusinessEvents({
      events: [
        {
          id: 'evt-1',
          timestamp: '2026-04-18T00:00:00.000Z',
          runtime: 'codex',
          projectName: '',
          rawStatus: 'optimized',
        },
      ],
      projectPath: '/tmp/project-a',
      projectName: 'project-a',
      deps: {
        escHtml: (value: unknown) => String(value ?? ''),
        escJsStr: (value: unknown) => JSON.stringify(String(value ?? '')).slice(1, -1),
        formatEventTimestamp: () => 'ts',
        getActivityColumnStyle: (key: string, width: number) => `width:${width};--${key}`,
        renderActivitySkillCell: () => '<button>skill</button>',
        renderScopeStatusBadge: () => '<span>status</span>',
        t: (key: string) => key,
      },
    });

    expect(html).toContain('activity-controls');
    expect(html).toContain('<button>skill</button>');
    expect(html).toContain('project-a');
    expect(html).toContain('<span>status</span>');
    expect(html).toContain("openActivityDetail('/tmp/project-a','evt-1')");
  });

  it('renders recent traces with detail actions and returns empty when no rows exist', async () => {
    const { renderDashboardRecentTraces } = await import('../../src/dashboard/web/render/activity-tables.js');

    const html = renderDashboardRecentTraces({
      projectPath: '/tmp/project-a',
      rows: [
        {
          id: 'raw:t-1',
          timestamp: '2026-04-18T00:00:00.000Z',
          runtime: 'claude',
          status: 'success',
          scopeId: 'scope-1',
          sessionId: 'session-abcdef',
          traceId: 'trace-123456',
          detail: 'detail body',
          rawTrace: { event_type: 'assistant_output' },
        },
      ],
      deps: {
        escHtml: (value: unknown) => String(value ?? ''),
        escJsStr: (value: unknown) => JSON.stringify(String(value ?? '')).slice(1, -1),
        formatEventTimestamp: () => 'ts',
        getActivityColumnStyle: (key: string, width: number) => `width:${width};--${key}`,
        summarizeTraceEventType: () => 'assistant_output',
        t: (key: string) => key,
      },
    });

    expect(html).toContain('assistant_output');
    expect(html).toContain('detail body');
    expect(html).toContain("copyActivityDetail('/tmp/project-a','raw:t-1')");
    expect(
      renderDashboardRecentTraces({
        projectPath: '/tmp/project-a',
        rows: [],
        deps: {
          escHtml: (value: unknown) => String(value ?? ''),
          escJsStr: (value: unknown) => JSON.stringify(String(value ?? '')).slice(1, -1),
          formatEventTimestamp: () => 'ts',
          getActivityColumnStyle: (key: string, width: number) => `width:${width};--${key}`,
          summarizeTraceEventType: () => 'assistant_output',
          t: (key: string) => key,
        },
      })
    ).toBe('');
  });

  it('exposes activity table source for browser injection', async () => {
    const { renderDashboardActivityTablesSource } = await import('../../src/dashboard/web/render/activity-tables.js');

    const source = renderDashboardActivityTablesSource();
    expect(source).toContain('function renderDashboardBusinessEvents');
    expect(source).toContain('function renderDashboardRecentTraces');
  });
});
