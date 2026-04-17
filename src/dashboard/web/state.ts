export const GLOBAL_CONFIG_SCOPE = '__global__';
const ACTIVITY_COLUMN_WIDTHS_TOKEN = '__DASHBOARD_ACTIVITY_COLUMN_WIDTHS__';

export function createDashboardState<TActivityColumnWidths>(
  loadSavedActivityColumnWidths: () => TActivityColumnWidths
) {
  return {
    projects: [],
    selectedProjectId: null,
    projectData: {},
    staleProjectData: {},
    allLogs: [],
    logFilter: 'ALL',
    configByProject: {},
    monitoringMutationByProject: {},
    currentSkillId: null,
    selectedRuntimeTab: 'all',
    searchQuery: '',
    sortBy: 'name',
    sortOrder: 'asc',
    selectedMainTab: 'overview',
    currentSkillRuntime: 'codex',
    currentSkillVersion: null,
    currentSkillEffectiveVersion: null,
    currentSkillVersions: [],
    currentSkillVersionMeta: {},
    currentSkillVersionContextKey: '',
    activityLayer: 'business',
    activityTagFilter: 'core_flow',
    activityRowsByProject: {},
    rawActivityRowsByProject: {},
    activityScopeDetailsByProject: {},
    activityColumnWidths: loadSavedActivityColumnWidths(),
    lastCopiedActivityText: '',
    providerHealthByProject: {},
    providerCatalog: [],
    providerCatalogLoading: false,
    providerCatalogError: '',
    configUiByProject: {},
    configLoadingByProject: {},
    configLoadErrorByProject: {},
  };
}

export function createProjectSnapshotLoads() {
  return {};
}

export function buildEmptyProjectData() {
  return {
    daemon: {
      isRunning: false,
      isPaused: false,
      pid: null,
      startedAt: null,
      processedTraces: 0,
      lastCheckpointAt: null,
      retryQueueSize: 0,
      monitoringState: 'active',
      pausedAt: null,
      optimizationStatus: {
        currentState: 'idle',
        currentSkillId: null,
        lastOptimizationAt: null,
        lastError: null,
        queueSize: 0,
      },
    },
    skills: [],
    traceStats: { total: 0, byRuntime: {}, byStatus: {}, byEventType: {} },
    recentTraces: [],
    decisionEvents: [],
    activityScopes: [],
    agentUsage: {
      callCount: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      durationMsTotal: 0,
      avgDurationMs: 0,
      lastCallAt: null,
      byModel: {},
      byScope: {},
      bySkill: {},
    },
  };
}

function formatScriptLiteral(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(
    /^(\s*)"([A-Za-z_$][\w$]*)":/gm,
    '$1$2:'
  );
}

export function renderDashboardStateSource(): string {
  const stateLiteral = formatScriptLiteral(
    createDashboardState(() => ACTIVITY_COLUMN_WIDTHS_TOKEN)
  ).replace(
    `"${ACTIVITY_COLUMN_WIDTHS_TOKEN}"`,
    'loadSavedActivityColumnWidths()'
  );
  const projectSnapshotLoadsLiteral = formatScriptLiteral(createProjectSnapshotLoads());
  const emptyProjectDataLiteral = formatScriptLiteral(buildEmptyProjectData());
  const globalConfigScopeLiteral = JSON.stringify(GLOBAL_CONFIG_SCOPE);

  return [
    `const GLOBAL_CONFIG_SCOPE = ${globalConfigScopeLiteral};`,
    '',
    `const state = ${stateLiteral};`,
    '',
    `const projectSnapshotLoads = ${projectSnapshotLoadsLiteral};`,
    '',
    'function buildEmptyProjectData() {',
    `  return ${emptyProjectDataLiteral};`,
    '}',
  ].join('\n');
}
