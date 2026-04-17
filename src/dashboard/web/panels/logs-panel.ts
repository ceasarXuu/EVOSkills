type DashboardLogsPanelInput = {
  deps: {
    t: (key: string) => string;
  };
  logFilter: string;
};

export function renderDashboardLogsPanel(input: DashboardLogsPanelInput): string {
  const { deps } = input;

  return `
    <div class="log-panel">
      <div class="log-header">
        <span class="log-title">${deps.t('logTitle')}</span>
        <select class="log-filter" id="logFilter" onchange="filterLogs()">
          <option value="ALL" ${input.logFilter === 'ALL' ? 'selected' : ''}>${deps.t('logFilterAll')}</option>
          <option value="INFO" ${input.logFilter === 'INFO' ? 'selected' : ''}>INFO</option>
          <option value="WARN" ${input.logFilter === 'WARN' ? 'selected' : ''}>WARN</option>
          <option value="ERROR" ${input.logFilter === 'ERROR' ? 'selected' : ''}>ERROR</option>
        </select>
      </div>
      <div class="log-list" id="logList"></div>
    </div>
  `;
}

export function renderDashboardLogsPanelSource(): string {
  return renderDashboardLogsPanel.toString();
}
