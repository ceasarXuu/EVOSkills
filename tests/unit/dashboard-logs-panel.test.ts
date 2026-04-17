import { describe, expect, it } from 'vitest';

describe('dashboard logs panel', () => {
  it('renders the log panel title and selected filter', async () => {
    const { renderDashboardLogsPanel } = await import('../../src/dashboard/web/panels/logs-panel.js');

    const html = renderDashboardLogsPanel({
      deps: {
        t: (key: string) => key,
      },
      logFilter: 'WARN',
    });

    expect(html).toContain('class="log-panel"');
    expect(html).toContain('class="log-title">logTitle</span>');
    expect(html).toContain('<option value="WARN" selected>WARN</option>');
    expect(html).toContain('<div class="log-list" id="logList"></div>');
  });
});
