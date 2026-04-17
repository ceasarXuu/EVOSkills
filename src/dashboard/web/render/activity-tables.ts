type DashboardActivityRow = {
  id: string;
  timestamp?: string;
  runtime?: string | null;
  projectName?: string | null;
  rawStatus?: string | null;
};

type DashboardRecentTraceRow = {
  id: string;
  timestamp?: string;
  runtime?: string | null;
  status?: string | null;
  scopeId?: string | null;
  sessionId?: string | null;
  traceId?: string | null;
  detail?: string | null;
  rawTrace?: unknown;
};

type RenderDashboardBusinessEventsInput = {
  deps: {
    escHtml: (value: unknown) => string;
    escJsStr: (value: unknown) => string;
    formatEventTimestamp: (value: string) => string;
    getActivityColumnStyle: (columnKey: string, fallbackWidth: number) => string;
    renderActivitySkillCell: (projectPath: string, row: DashboardActivityRow) => string;
    renderScopeStatusBadge: (rawStatus: unknown) => string;
    t: (key: string) => string;
  };
  events: DashboardActivityRow[];
  projectName: string;
  projectPath: string;
};

type RenderDashboardRecentTracesInput = {
  deps: {
    escHtml: (value: unknown) => string;
    escJsStr: (value: unknown) => string;
    formatEventTimestamp: (value: string) => string;
    getActivityColumnStyle: (columnKey: string, fallbackWidth: number) => string;
    summarizeTraceEventType: (trace: unknown) => string;
    t: (key: string) => string;
  };
  projectPath: string;
  rows: DashboardRecentTraceRow[];
};

export function renderDashboardBusinessEvents(
  input: RenderDashboardBusinessEventsInput
): string {
  const { deps, events, projectName, projectPath } = input;
  return `
    <div class="activity-controls">
      <div class="activity-left"></div>
      <div style="font-size:10px;color:var(--muted)">${events.length}</div>
    </div>
    ${events.length === 0 ? `<div class="empty-state">${deps.t('activityEmpty')}</div>` : `<div class="trace-table-wrap">
      <table class="activity-table">
        <thead><tr>
          <th style="${deps.getActivityColumnStyle('time', 180)}">${deps.t('traceTime')}<span class="column-resizer" onmousedown="startActivityColumnResize(event,'time')"></span></th>
          <th style="${deps.getActivityColumnStyle('skill', 240)}">${deps.t('activitySkillLabel')}<span class="column-resizer" onmousedown="startActivityColumnResize(event,'skill')"></span></th>
          <th style="${deps.getActivityColumnStyle('host', 110)}">${deps.t('traceRuntime')}<span class="column-resizer" onmousedown="startActivityColumnResize(event,'host')"></span></th>
          <th style="${deps.getActivityColumnStyle('project', 180)}">${deps.t('activityProject')}<span class="column-resizer" onmousedown="startActivityColumnResize(event,'project')"></span></th>
          <th style="${deps.getActivityColumnStyle('status', 140)}">${deps.t('traceStatus')}<span class="column-resizer" onmousedown="startActivityColumnResize(event,'status')"></span></th>
        </tr></thead>
        <tbody>
          ${events.slice(0, 120).map((row) => `<tr class="activity-scope-row" onclick="openActivityDetail('${deps.escJsStr(projectPath)}','${deps.escJsStr(row.id)}')">
            <td style="color:var(--muted);${deps.getActivityColumnStyle('time', 180)}">${deps.formatEventTimestamp(String(row.timestamp || ''))}</td>
            <td style="${deps.getActivityColumnStyle('skill', 240)}">${deps.renderActivitySkillCell(projectPath, row)}</td>
            <td style="${deps.getActivityColumnStyle('host', 110)}">${deps.escHtml(row.runtime || deps.t('activityHostFallback'))}</td>
            <td style="${deps.getActivityColumnStyle('project', 180)}">${deps.escHtml(row.projectName || projectName)}</td>
            <td style="${deps.getActivityColumnStyle('status', 140)}">${deps.renderScopeStatusBadge(row.rawStatus)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`}
  `;
}

export function renderDashboardRecentTraces(
  input: RenderDashboardRecentTracesInput
): string {
  const { deps, projectPath, rows } = input;
  if (!rows.length) {
    return '';
  }

  return `<table class="activity-table">
    <thead><tr>
      <th style="${deps.getActivityColumnStyle('time', 180)}">${deps.t('traceTime')}<span class="column-resizer" onmousedown="startActivityColumnResize(event,'time')"></span></th>
      <th style="${deps.getActivityColumnStyle('host', 96)}">${deps.t('traceRuntime')}<span class="column-resizer" onmousedown="startActivityColumnResize(event,'host')"></span></th>
      <th style="${deps.getActivityColumnStyle('event', 128)}">${deps.t('traceEvent')}<span class="column-resizer" onmousedown="startActivityColumnResize(event,'event')"></span></th>
      <th style="${deps.getActivityColumnStyle('status', 120)}">${deps.t('traceStatus')}<span class="column-resizer" onmousedown="startActivityColumnResize(event,'status')"></span></th>
      <th style="${deps.getActivityColumnStyle('scope', 180)}">${deps.t('traceScope')}<span class="column-resizer" onmousedown="startActivityColumnResize(event,'scope')"></span></th>
      <th style="width:120px;min-width:120px;">${deps.t('traceSession')}</th>
      <th style="width:120px;min-width:120px;">${deps.t('traceId')}</th>
      <th style="${deps.getActivityColumnStyle('detail', 520)}">${deps.t('traceDetail')}<span class="column-resizer" onmousedown="startActivityColumnResize(event,'detail')"></span></th>
      <th style="width:120px;min-width:120px;">${deps.t('traceAction')}</th>
    </tr></thead>
    <tbody>${rows.slice(0, 50).map((row) => `<tr>
      <td style="color:var(--muted);${deps.getActivityColumnStyle('time', 180)}">${deps.formatEventTimestamp(String(row.timestamp || ''))}</td>
      <td style="${deps.getActivityColumnStyle('host', 96)}">${deps.escHtml(row.runtime || deps.t('activityHostFallback'))}</td>
      <td style="${deps.getActivityColumnStyle('event', 128)}">${deps.escHtml(deps.summarizeTraceEventType(row.rawTrace))}</td>
      <td style="color:var(--muted);${deps.getActivityColumnStyle('status', 120)}">${deps.escHtml(row.status || deps.t('activityStatusFallback'))}</td>
      <td style="${deps.getActivityColumnStyle('scope', 180)}">${deps.escHtml(row.scopeId || deps.t('activityScopeFallback'))}</td>
      <td style="color:var(--muted);width:120px;min-width:120px;">${deps.escHtml(String(row.sessionId || '—').slice(0, 8))}</td>
      <td style="color:var(--muted);width:120px;min-width:120px;">${deps.escHtml(String(row.traceId || '—').slice(0, 8))}</td>
      <td style="${deps.getActivityColumnStyle('detail', 520)}"><div class="business-detail-preview">${deps.escHtml(row.detail || deps.t('activityDetailFallback'))}</div></td>
      <td style="width:120px;min-width:120px;">
        <div class="business-detail-actions">
          <button class="detail-copy-btn" onclick="copyActivityDetail('${deps.escJsStr(projectPath)}','${deps.escJsStr(row.id)}')">${deps.t('activityCopy')}</button>
          <button class="detail-view-btn" onclick="openActivityDetail('${deps.escJsStr(projectPath)}','${deps.escJsStr(row.id)}')">${deps.t('activityViewDetails')}</button>
        </div>
      </td>
    </tr>`).join('')}</tbody>
  </table>`;
}

export function renderDashboardActivityTablesSource(): string {
  return [
    renderDashboardBusinessEvents.toString(),
    renderDashboardRecentTraces.toString(),
  ].join('\n\n');
}
