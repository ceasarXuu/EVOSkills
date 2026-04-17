const DASHBOARD_ACTIVITY_LISTING_SOURCE = `function loadSavedActivityColumnWidths() {
  try {
    const raw = localStorage.getItem('ornn-dashboard-activity-columns');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function persistActivityColumnWidths() {
  try {
    localStorage.setItem('ornn-dashboard-activity-columns', JSON.stringify(state.activityColumnWidths || {}));
  } catch {}
}

const DEFAULT_ACTIVITY_TIME_COLUMN_WIDTH = 172;

function getActivityColumnWidth(columnKey, fallbackWidth) {
  const width = Number(state.activityColumnWidths?.[columnKey]);
  if (!Number.isFinite(width) || width <= 0) return fallbackWidth;
  if (columnKey === 'time' && width < fallbackWidth) return fallbackWidth;
  return width;
}

function getActivityColumnStyle(columnKey, fallbackWidth) {
  const width = getActivityColumnWidth(columnKey, fallbackWidth);
  return 'width:' + width + 'px;min-width:' + width + 'px;';
}

function startActivityColumnResize(event, columnKey) {
  if (!event || !columnKey) return;
  if (event.preventDefault) event.preventDefault();
  const startX = event.clientX || 0;
  const startWidth = getActivityColumnWidth(columnKey, 120);

  function handleMove(moveEvent) {
    const delta = (moveEvent.clientX || 0) - startX;
    state.activityColumnWidths[columnKey] = Math.max(72, startWidth + delta);
    if (state.selectedProjectId) safeRenderMainPanel(state.selectedProjectId, 'startActivityColumnResize');
  }

  function handleUp() {
    window.removeEventListener('mousemove', handleMove);
    window.removeEventListener('mouseup', handleUp);
    persistActivityColumnWidths();
  }

  window.addEventListener('mousemove', handleMove);
  window.addEventListener('mouseup', handleUp);
}

function formatEventTimestamp(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return String(iso) || '—';
  }
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-') + ' ' + [
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0'),
  ].join(':');
}

function getProjectName(projectPath) {
  if (!projectPath) return '—';
  const normalized = String(projectPath).replace(/[\\/]+$/, '');
  const parts = normalized.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || normalized || '—';
}

function localizeActivityScopeStatus(status) {
  switch (status) {
  case 'optimized':
    return t('activityScopeStatusOptimized');
  case 'no_optimization':
    return t('activityScopeStatusNoOptimization');
  case 'observing':
  default:
    return t('activityScopeStatusObserving');
  }
}

function buildScopeActivityRows(projectPath) {
  const pd = state.projectData[projectPath] || {};
  const scopes = Array.isArray(pd.activityScopes) ? pd.activityScopes : [];
  const rows = scopes.map((scope) => ({
    id: 'scope:' + scope.scopeId,
    kind: 'scope',
    scopeId: scope.scopeId,
    timestamp: scope.createdAt || '',
    updatedAt: scope.updatedAt || scope.createdAt || '',
    runtime: scope.runtime || t('activityHostFallback'),
    skillId: scope.skillId || null,
    projectName: scope.projectName || getProjectName(projectPath),
    rawStatus: scope.status || 'observing',
    status: localizeActivityScopeStatus(scope.status),
    sessionId: scope.sessionId || null,
  })).sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));

  state.activityRowsByProject[projectPath] = rows;
  return rows;
}

function isScopeActivityRow(row) {
  return Boolean(row && row.kind === 'scope' && row.scopeId);
}

function getScopeDetailCache(projectPath) {
  if (!state.activityScopeDetailsByProject[projectPath]) {
    state.activityScopeDetailsByProject[projectPath] = {};
  }
  return state.activityScopeDetailsByProject[projectPath];
}

function invalidateActivityScopeDetails(projectPath) {
  if (projectPath) {
    delete state.activityScopeDetailsByProject[projectPath];
    return;
  }
  state.activityScopeDetailsByProject = {};
}

function resolveActivitySkillTarget(projectPath, row) {
  const skillId = row && typeof row.skillId === 'string' ? row.skillId.trim() : '';
  if (!skillId || skillId === '—' || skillId.includes(',')) return null;

  const skills = Array.isArray(state.projectData[projectPath]?.skills)
    ? state.projectData[projectPath].skills
    : [];
  const preferredRuntime = row && typeof row.runtime === 'string' ? row.runtime.trim() : '';

  const exact = skills.find((skill) => skill.skillId === skillId && (skill.runtime || 'codex') === preferredRuntime);
  if (exact) {
    return { skillId, runtime: exact.runtime || 'codex' };
  }

  const fallback = skills.find((skill) => skill.skillId === skillId);
  if (!fallback) return null;
  return { skillId, runtime: fallback.runtime || 'codex' };
}

function renderActivitySkillCell(projectPath, row) {
  const skillId = row && typeof row.skillId === 'string' ? row.skillId : '';
  if (!skillId) return '—';

  const target = resolveActivitySkillTarget(projectPath, row);
  if (!target) return escHtml(skillId);

  return '<button class="activity-skill-link" onclick="viewSkill(\\'' +
    escJsStr(projectPath) + '\\',\\'' +
    escJsStr(target.skillId) + '\\',\\'' +
    escJsStr(target.runtime) +
    '\\');event.stopPropagation()">' +
    escHtml(skillId) +
    '</button>';
}

function renderBusinessEvents(projectPath) {
  const events = buildActivityRows(projectPath);
  return renderDashboardBusinessEvents({
    events,
    projectPath,
    projectName: getProjectName(projectPath),
    deps: {
      escHtml,
      escJsStr,
      formatEventTimestamp,
      getActivityColumnStyle,
      renderActivitySkillCell,
      renderScopeStatusBadge,
      t,
    },
  });
}

function buildRawTraceRows(projectPath) {
  const pd = state.projectData[projectPath] || {};
  const traces = Array.isArray(pd.recentTraces) ? pd.recentTraces : [];
  const decisionEvents = Array.isArray(pd.decisionEvents) ? pd.decisionEvents : [];
  const scopeByTraceId = new Map();

  for (const event of decisionEvents) {
    const scopeId = getActivityScopeId(event);
    if (scopeId && event.traceId) scopeByTraceId.set(event.traceId, scopeId);
  }

  const rows = traces
    .map((trace) => ({
      id: 'raw:' + trace.trace_id,
      timestamp: trace.timestamp || '',
      tag: trace.event_type || 'status',
      runtime: trace.runtime || t('activityHostFallback'),
      skillId: Array.isArray(trace.skill_refs) && trace.skill_refs.length > 0 ? trace.skill_refs.join(', ') : null,
      status: trace.status || t('activityStatusFallback'),
      scopeId: scopeByTraceId.get(trace.trace_id) || null,
      detail: formatRawTracePreview(trace),
      sourceLabel: t('activitySourceTrace'),
      traceId: trace.trace_id || null,
      sessionId: trace.session_id || null,
      rawTrace: trace,
    }))
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
    .slice(0, 150);

  state.rawActivityRowsByProject[projectPath] = rows;
  return rows;
}`;

export function renderDashboardActivityListingSource(): string {
  return DASHBOARD_ACTIVITY_LISTING_SOURCE.trim();
}
