export const DASHBOARD_BOOTSTRAP_CACHE_STORAGE_KEY = 'ornn-dashboard-bootstrap-cache';
export const DASHBOARD_BOOTSTRAP_CACHE_VERSION = 1;
export const DASHBOARD_BOOTSTRAP_CACHE_TTL_MS = 30 * 60 * 1000;

type DashboardMainTab = 'skills' | 'project' | 'config';
type DashboardRuntimeTab = 'all' | 'codex' | 'claude' | 'opencode';
type DashboardConfigSubTab = 'model' | 'evolution';
type DashboardSortBy = 'name' | 'updated';
type DashboardSortOrder = 'asc' | 'desc';

export interface DashboardBootstrapCacheUiState {
  selectedProjectId: string | null;
  selectedMainTab: DashboardMainTab;
  selectedSkillFamilyId: string | null;
  selectedRuntimeTab: DashboardRuntimeTab;
  selectedConfigSubTab: DashboardConfigSubTab;
  searchQuery: string;
  sortBy: DashboardSortBy;
  sortOrder: DashboardSortOrder;
}

export interface DashboardBootstrapProjectSnapshot {
  projectPath: string;
  snapshot: Record<string, unknown>;
}

export interface DashboardBootstrapSkillLibrary {
  families: Array<Record<string, unknown>>;
  selectedFamilyId: string | null;
  family: Record<string, unknown> | null;
  instances: Array<Record<string, unknown>>;
}

export interface DashboardBootstrapCacheRecord {
  version: number;
  buildId: string;
  cachedAt: string;
  ui: DashboardBootstrapCacheUiState;
  projects: Array<Record<string, unknown>>;
  selectedProjectSnapshot: DashboardBootstrapProjectSnapshot | null;
  skillLibrary: DashboardBootstrapSkillLibrary | null;
}

interface RestoreDashboardBootstrapCacheOptions {
  buildId: string;
  nowMs: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeMainTab(value: unknown): DashboardMainTab {
  return value === 'project' || value === 'config' ? value : 'skills';
}

function normalizeRuntimeTab(value: unknown): DashboardRuntimeTab {
  return value === 'codex' || value === 'claude' || value === 'opencode' ? value : 'all';
}

function normalizeConfigSubTab(value: unknown): DashboardConfigSubTab {
  return value === 'evolution' ? 'evolution' : 'model';
}

function normalizeSortBy(value: unknown): DashboardSortBy {
  return value === 'updated' ? 'updated' : 'name';
}

function normalizeSortOrder(value: unknown): DashboardSortOrder {
  return value === 'desc' ? 'desc' : 'asc';
}

function normalizeProjects(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => isRecord(item) && typeof item.path === 'string') as Array<Record<string, unknown>>;
}

function normalizeSkillLibrary(value: unknown): DashboardBootstrapSkillLibrary | null {
  if (!isRecord(value)) return null;
  const families = Array.isArray(value.families)
    ? value.families.filter((item) => isRecord(item) && typeof item.familyId === 'string') as Array<Record<string, unknown>>
    : [];
  if (families.length === 0) return null;
  return {
    families,
    selectedFamilyId: typeof value.selectedFamilyId === 'string' ? value.selectedFamilyId : null,
    family: isRecord(value.family) ? value.family : null,
    instances: Array.isArray(value.instances)
      ? value.instances.filter((item) => isRecord(item)) as Array<Record<string, unknown>>
      : [],
  };
}

function normalizeSelectedProjectId(
  requestedProjectId: unknown,
  projects: Array<Record<string, unknown>>
): string | null {
  const projectPaths = projects
    .map((project) => (typeof project.path === 'string' ? project.path : ''))
    .filter((item) => item.length > 0);
  if (typeof requestedProjectId === 'string' && projectPaths.includes(requestedProjectId)) {
    return requestedProjectId;
  }
  return projectPaths[0] || null;
}

function normalizeSelectedFamilyId(
  requestedFamilyId: unknown,
  skillLibrary: DashboardBootstrapSkillLibrary | null
): string | null {
  if (!skillLibrary) return null;
  const familyIds = skillLibrary.families
    .map((family) => (typeof family.familyId === 'string' ? family.familyId : ''))
    .filter((item) => item.length > 0);
  if (typeof requestedFamilyId === 'string' && familyIds.includes(requestedFamilyId)) {
    return requestedFamilyId;
  }
  return familyIds[0] || null;
}

function normalizeUiState(
  value: unknown,
  projects: Array<Record<string, unknown>>,
  skillLibrary: DashboardBootstrapSkillLibrary | null
): DashboardBootstrapCacheUiState {
  const raw = isRecord(value) ? value : {};
  return {
    selectedProjectId: normalizeSelectedProjectId(raw.selectedProjectId, projects),
    selectedMainTab: normalizeMainTab(raw.selectedMainTab),
    selectedSkillFamilyId: normalizeSelectedFamilyId(raw.selectedSkillFamilyId, skillLibrary),
    selectedRuntimeTab: normalizeRuntimeTab(raw.selectedRuntimeTab),
    selectedConfigSubTab: normalizeConfigSubTab(raw.selectedConfigSubTab),
    searchQuery: typeof raw.searchQuery === 'string' ? raw.searchQuery : '',
    sortBy: normalizeSortBy(raw.sortBy),
    sortOrder: normalizeSortOrder(raw.sortOrder),
  };
}

export function createDashboardBootstrapCacheRecord(
  input: Omit<DashboardBootstrapCacheRecord, 'version'>
): DashboardBootstrapCacheRecord {
  return {
    version: DASHBOARD_BOOTSTRAP_CACHE_VERSION,
    buildId: input.buildId,
    cachedAt: input.cachedAt,
    ui: input.ui,
    projects: input.projects,
    selectedProjectSnapshot: input.selectedProjectSnapshot,
    skillLibrary: input.skillLibrary,
  };
}

export function restoreDashboardBootstrapCacheRecord(
  rawValue: unknown,
  options: RestoreDashboardBootstrapCacheOptions
): DashboardBootstrapCacheRecord | null {
  if (!isRecord(rawValue)) return null;
  if (rawValue.version !== DASHBOARD_BOOTSTRAP_CACHE_VERSION) return null;
  if (rawValue.buildId !== options.buildId) return null;

  const cachedAt = typeof rawValue.cachedAt === 'string' ? rawValue.cachedAt : '';
  const cachedAtMs = Date.parse(cachedAt);
  if (!Number.isFinite(cachedAtMs)) return null;
  if (options.nowMs - cachedAtMs > DASHBOARD_BOOTSTRAP_CACHE_TTL_MS) return null;

  const projects = normalizeProjects(rawValue.projects);
  const skillLibrary = normalizeSkillLibrary(rawValue.skillLibrary);
  const ui = normalizeUiState(rawValue.ui, projects, skillLibrary);

  let selectedProjectSnapshot: DashboardBootstrapProjectSnapshot | null = null;
  if (isRecord(rawValue.selectedProjectSnapshot)) {
    const projectPath =
      typeof rawValue.selectedProjectSnapshot.projectPath === 'string'
        ? rawValue.selectedProjectSnapshot.projectPath
        : '';
    const snapshot = isRecord(rawValue.selectedProjectSnapshot.snapshot)
      ? rawValue.selectedProjectSnapshot.snapshot
      : null;
    if (projectPath && snapshot && projectPath === ui.selectedProjectId) {
      selectedProjectSnapshot = { projectPath, snapshot };
    }
  }

  return {
    version: DASHBOARD_BOOTSTRAP_CACHE_VERSION,
    buildId: options.buildId,
    cachedAt,
    ui,
    projects,
    selectedProjectSnapshot,
    skillLibrary: skillLibrary
      ? {
          families: skillLibrary.families,
          selectedFamilyId: ui.selectedSkillFamilyId,
          family: skillLibrary.family,
          instances: skillLibrary.instances,
        }
      : null,
  };
}

export function renderDashboardBootstrapCacheSource(): string {
  const storageKeyLiteral = JSON.stringify(DASHBOARD_BOOTSTRAP_CACHE_STORAGE_KEY);
  const versionLiteral = JSON.stringify(DASHBOARD_BOOTSTRAP_CACHE_VERSION);
  const ttlLiteral = JSON.stringify(DASHBOARD_BOOTSTRAP_CACHE_TTL_MS);

  return [
    `const DASHBOARD_BOOTSTRAP_CACHE_STORAGE_KEY = ${storageKeyLiteral};`,
    `const DASHBOARD_BOOTSTRAP_CACHE_VERSION = ${versionLiteral};`,
    `const DASHBOARD_BOOTSTRAP_CACHE_TTL_MS = ${ttlLiteral};`,
    'let dashboardBootstrapCacheSaveTimer = null;',
    '',
    'function isDashboardBootstrapRecord(value) {',
    "  return !!value && typeof value === 'object' && !Array.isArray(value);",
    '}',
    '',
    'function normalizeDashboardBootstrapMainTab(value) {',
    "  return value === 'project' || value === 'config' ? value : 'skills';",
    '}',
    '',
    'function normalizeDashboardBootstrapRuntimeTab(value) {',
    "  return value === 'codex' || value === 'claude' || value === 'opencode' ? value : 'all';",
    '}',
    '',
    'function normalizeDashboardBootstrapConfigSubTab(value) {',
    "  return value === 'evolution' ? 'evolution' : 'model';",
    '}',
    '',
    'function normalizeDashboardBootstrapSortBy(value) {',
    "  return value === 'updated' ? 'updated' : 'name';",
    '}',
    '',
    'function normalizeDashboardBootstrapSortOrder(value) {',
    "  return value === 'desc' ? 'desc' : 'asc';",
    '}',
    '',
    'function normalizeDashboardBootstrapProjects(value) {',
    '  if (!Array.isArray(value)) return [];',
    "  return value.filter(function(item) { return isDashboardBootstrapRecord(item) && typeof item.path === 'string'; });",
    '}',
    '',
    'function normalizeDashboardBootstrapSkillLibrary(value) {',
    '  if (!isDashboardBootstrapRecord(value)) return null;',
    '  const families = Array.isArray(value.families)',
    "    ? value.families.filter(function(item) { return isDashboardBootstrapRecord(item) && typeof item.familyId === 'string'; })",
    '    : [];',
    '  if (families.length === 0) return null;',
    '  return {',
    '    families: families,',
    "    selectedFamilyId: typeof value.selectedFamilyId === 'string' ? value.selectedFamilyId : null,",
    "    family: isDashboardBootstrapRecord(value.family) ? value.family : null,",
    "    instances: Array.isArray(value.instances) ? value.instances.filter(function(item) { return isDashboardBootstrapRecord(item); }) : [],",
    '  };',
    '}',
    '',
    'function normalizeDashboardBootstrapSelectedProjectId(requestedProjectId, projects) {',
    '  const projectPaths = projects',
    "    .map(function(project) { return typeof project.path === 'string' ? project.path : ''; })",
    "    .filter(function(item) { return item.length > 0; });",
    "  if (typeof requestedProjectId === 'string' && projectPaths.includes(requestedProjectId)) return requestedProjectId;",
    '  return projectPaths[0] || null;',
    '}',
    '',
    'function normalizeDashboardBootstrapSelectedFamilyId(requestedFamilyId, skillLibrary) {',
    '  if (!skillLibrary) return null;',
    '  const familyIds = skillLibrary.families',
    "    .map(function(family) { return typeof family.familyId === 'string' ? family.familyId : ''; })",
    "    .filter(function(item) { return item.length > 0; });",
    "  if (typeof requestedFamilyId === 'string' && familyIds.includes(requestedFamilyId)) return requestedFamilyId;",
    '  return familyIds[0] || null;',
    '}',
    '',
    'function restoreDashboardBootstrapCacheRecord(rawValue) {',
    '  if (!isDashboardBootstrapRecord(rawValue)) return null;',
    '  if (rawValue.version !== DASHBOARD_BOOTSTRAP_CACHE_VERSION) return null;',
    '  if (rawValue.buildId !== DASHBOARD_BUILD_ID) return null;',
    "  const cachedAt = typeof rawValue.cachedAt === 'string' ? rawValue.cachedAt : '';",
    '  const cachedAtMs = Date.parse(cachedAt);',
    '  if (!Number.isFinite(cachedAtMs)) return null;',
    '  if (Date.now() - cachedAtMs > DASHBOARD_BOOTSTRAP_CACHE_TTL_MS) return null;',
    '  const projects = normalizeDashboardBootstrapProjects(rawValue.projects);',
    '  const skillLibrary = normalizeDashboardBootstrapSkillLibrary(rawValue.skillLibrary);',
    '  const rawUi = isDashboardBootstrapRecord(rawValue.ui) ? rawValue.ui : {};',
    '  const ui = {',
    '    selectedProjectId: normalizeDashboardBootstrapSelectedProjectId(rawUi.selectedProjectId, projects),',
    '    selectedMainTab: normalizeDashboardBootstrapMainTab(rawUi.selectedMainTab),',
    '    selectedSkillFamilyId: normalizeDashboardBootstrapSelectedFamilyId(rawUi.selectedSkillFamilyId, skillLibrary),',
    '    selectedRuntimeTab: normalizeDashboardBootstrapRuntimeTab(rawUi.selectedRuntimeTab),',
    '    selectedConfigSubTab: normalizeDashboardBootstrapConfigSubTab(rawUi.selectedConfigSubTab),',
    "    searchQuery: typeof rawUi.searchQuery === 'string' ? rawUi.searchQuery : '',",
    '    sortBy: normalizeDashboardBootstrapSortBy(rawUi.sortBy),',
    '    sortOrder: normalizeDashboardBootstrapSortOrder(rawUi.sortOrder),',
    '  };',
    '  let selectedProjectSnapshot = null;',
    '  if (isDashboardBootstrapRecord(rawValue.selectedProjectSnapshot)) {',
    "    const projectPath = typeof rawValue.selectedProjectSnapshot.projectPath === 'string' ? rawValue.selectedProjectSnapshot.projectPath : '';",
    '    const snapshot = isDashboardBootstrapRecord(rawValue.selectedProjectSnapshot.snapshot)',
    '      ? rawValue.selectedProjectSnapshot.snapshot',
    '      : null;',
    '    if (projectPath && snapshot && projectPath === ui.selectedProjectId) {',
    '      selectedProjectSnapshot = { projectPath: projectPath, snapshot: snapshot };',
    '    }',
    '  }',
    '  return {',
    '    version: DASHBOARD_BOOTSTRAP_CACHE_VERSION,',
    '    buildId: DASHBOARD_BUILD_ID,',
    '    cachedAt: cachedAt,',
    '    ui: ui,',
    '    projects: projects,',
    '    selectedProjectSnapshot: selectedProjectSnapshot,',
    '    skillLibrary: skillLibrary',
    '      ? {',
    '          families: skillLibrary.families,',
    '          selectedFamilyId: ui.selectedSkillFamilyId,',
    '          family: skillLibrary.family,',
    '          instances: skillLibrary.instances,',
    '        }',
    '      : null,',
    '  };',
    '}',
    '',
    'function readDashboardBootstrapCacheRecord() {',
    '  try {',
    '    const raw = localStorage.getItem(DASHBOARD_BOOTSTRAP_CACHE_STORAGE_KEY);',
    '    if (!raw) return null;',
    '    const parsed = JSON.parse(raw);',
    '    const record = restoreDashboardBootstrapCacheRecord(parsed);',
    '    if (!record) {',
    "      console.debug('[dashboard] bootstrap cache invalidated');",
    '      localStorage.removeItem(DASHBOARD_BOOTSTRAP_CACHE_STORAGE_KEY);',
    '      return null;',
    '    }',
    '    return record;',
    '  } catch (error) {',
    "    console.warn('[dashboard] bootstrap cache read failed', { error: String(error) });",
    '    return null;',
    '  }',
    '}',
    '',
    'function hasDashboardBootstrapRenderableState() {',
    '  return state.projects.length > 0 ||',
    '    !!state.selectedSkillFamilyId ||',
    '    (state.selectedProjectId && !!state.projectData[state.selectedProjectId]);',
    '}',
    '',
    'function hydrateDashboardFromBootstrapCache() {',
    '  const record = readDashboardBootstrapCacheRecord();',
    '  if (!record) return { hydrated: false, record: null };',
    '  state.projects = record.projects;',
    '  state.selectedProjectId = record.ui.selectedProjectId;',
    '  state.selectedMainTab = record.ui.selectedMainTab;',
    "  state.selectedSkillsSubTab = 'skill_library';",
    '  state.selectedSkillFamilyId = record.ui.selectedSkillFamilyId;',
    '  state.selectedRuntimeTab = record.ui.selectedRuntimeTab;',
    '  state.selectedConfigSubTab = record.ui.selectedConfigSubTab;',
    '  state.searchQuery = record.ui.searchQuery;',
    '  state.sortBy = record.ui.sortBy;',
    '  state.sortOrder = record.ui.sortOrder;',
    '  if (record.selectedProjectSnapshot) {',
    '    state.projectData[record.selectedProjectSnapshot.projectPath] = record.selectedProjectSnapshot.snapshot;',
    '    state.staleProjectData[record.selectedProjectSnapshot.projectPath] = false;',
    '  }',
    '  if (record.skillLibrary) {',
    '    state.skillFamilies = record.skillLibrary.families;',
    '    state.skillLibraryLoaded = true;',
    '    state.skillLibraryLoading = false;',
    "    state.skillLibraryError = '';",
    '    if (record.skillLibrary.selectedFamilyId) {',
    '      state.skillFamilyDetailsById[record.skillLibrary.selectedFamilyId] = record.skillLibrary.family;',
    '      state.skillFamilyInstancesById[record.skillLibrary.selectedFamilyId] = record.skillLibrary.instances;',
    '    }',
    '  }',
    "  console.info('[dashboard] bootstrap cache hit', {",
    '    projectCount: state.projects.length,',
    '    selectedProjectId: state.selectedProjectId,',
    '    selectedSkillFamilyId: state.selectedSkillFamilyId,',
    '    selectedConfigSubTab: state.selectedConfigSubTab,',
    '  });',
    '  return { hydrated: true, record: record };',
    '}',
    '',
    'function buildDashboardBootstrapCacheRecord() {',
    '  const selectedProjectId = typeof state.selectedProjectId === \'string\' ? state.selectedProjectId : null;',
    '  const selectedProjectSnapshot = selectedProjectId && state.projectData[selectedProjectId]',
    '    ? { projectPath: selectedProjectId, snapshot: state.projectData[selectedProjectId] }',
    '    : null;',
    '  const selectedFamilyId = typeof state.selectedSkillFamilyId === \'string\' ? state.selectedSkillFamilyId : null;',
    '  const skillLibrary = state.skillLibraryLoaded && Array.isArray(state.skillFamilies) && state.skillFamilies.length > 0',
    '    ? {',
    '        families: state.skillFamilies,',
    '        selectedFamilyId: selectedFamilyId,',
    '        family: selectedFamilyId ? (state.skillFamilyDetailsById[selectedFamilyId] || null) : null,',
    '        instances: selectedFamilyId ? (state.skillFamilyInstancesById[selectedFamilyId] || []) : [],',
    '      }',
    '    : null;',
    '  return {',
    '    version: DASHBOARD_BOOTSTRAP_CACHE_VERSION,',
    '    buildId: DASHBOARD_BUILD_ID,',
    '    cachedAt: new Date().toISOString(),',
    '    ui: {',
    '      selectedProjectId: selectedProjectId,',
    "      selectedMainTab: state.selectedMainTab === 'project' || state.selectedMainTab === 'config' ? state.selectedMainTab : 'skills',",
    '      selectedSkillFamilyId: selectedFamilyId,',
    "      selectedRuntimeTab: state.selectedRuntimeTab === 'codex' || state.selectedRuntimeTab === 'claude' || state.selectedRuntimeTab === 'opencode' ? state.selectedRuntimeTab : 'all',",
    "      selectedConfigSubTab: state.selectedConfigSubTab === 'evolution' ? 'evolution' : 'model',",
    "      searchQuery: typeof state.searchQuery === 'string' ? state.searchQuery : '',",
    "      sortBy: state.sortBy === 'updated' ? 'updated' : 'name',",
    "      sortOrder: state.sortOrder === 'desc' ? 'desc' : 'asc',",
    '    },',
    '    projects: Array.isArray(state.projects) ? state.projects : [],',
    '    selectedProjectSnapshot: selectedProjectSnapshot,',
    '    skillLibrary: skillLibrary,',
    '  };',
    '}',
    '',
    'function saveDashboardBootstrapCache(reason) {',
    '  try {',
    '    const record = buildDashboardBootstrapCacheRecord();',
    '    localStorage.setItem(DASHBOARD_BOOTSTRAP_CACHE_STORAGE_KEY, JSON.stringify(record));',
    "    console.debug('[dashboard] bootstrap cache saved', {",
    '      reason: reason || \'unknown\',',
    '      selectedProjectId: record.ui.selectedProjectId,',
    '      selectedSkillFamilyId: record.ui.selectedSkillFamilyId,',
    '      selectedConfigSubTab: record.ui.selectedConfigSubTab,',
    '    });',
    '  } catch (error) {',
    "    console.warn('[dashboard] bootstrap cache save failed', { reason: reason || 'unknown', error: String(error) });",
    '  }',
    '}',
    '',
    'function scheduleDashboardBootstrapCacheSave(reason) {',
    '  if (dashboardBootstrapCacheSaveTimer !== null) {',
    '    clearTimeout(dashboardBootstrapCacheSaveTimer);',
    '  }',
    '  dashboardBootstrapCacheSaveTimer = setTimeout(function() {',
    '    dashboardBootstrapCacheSaveTimer = null;',
    '    saveDashboardBootstrapCache(reason);',
    '  }, 120);',
    '}',
    '',
    'async function revalidateDashboardBootstrapData() {',
    '  const activeProjectId = state.selectedProjectId;',
    '  const activeMainTab = typeof normalizeMainTab === \'function\' ? normalizeMainTab(state.selectedMainTab) : state.selectedMainTab;',
    '  if (typeof loadSkillLibrary === \'function\' && (state.skillLibraryLoaded || activeMainTab === \'skills\')) {',
    '    const preserveInlineSkillLibraryDetail =',
    '      typeof normalizeSkillsSubTab === \'function\' &&',
    '      normalizeSkillsSubTab(state.selectedSkillsSubTab) === \'skill_library\' &&',
    '      !!state.selectedSkillFamilyId &&',
    '      !!state.currentSkillId;',
    '    try {',
    '      await loadSkillLibrary(true, preserveInlineSkillLibraryDetail ? { preserveInlineDetail: true } : undefined);',
    '      if (preserveInlineSkillLibraryDetail && typeof updateSkillsList === \'function\') {',
    '        updateSkillsList();',
    '      }',
    '    } catch (error) {',
    "      console.warn('[dashboard] bootstrap skill library revalidate failed', { error: String(error) });",
    '    }',
    '  }',
    '  if (activeProjectId && state.projectData[activeProjectId] && typeof loadProjectSnapshot === \'function\') {',
    '    try {',
    '      await loadProjectSnapshot(activeProjectId, { force: true });',
    '      renderSidebar();',
    '      if (state.selectedProjectId === activeProjectId && activeMainTab === \'project\' && typeof safeRenderMainPanel === \'function\') {',
    "        safeRenderMainPanel(activeProjectId, 'bootstrapRevalidate');",
    '      }',
    '    } catch (error) {',
    "      console.warn('[dashboard] bootstrap project snapshot revalidate failed', { projectPath: activeProjectId, error: String(error) });",
    '    }',
    '  }',
    "  scheduleDashboardBootstrapCacheSave('bootstrapRevalidate');",
    '}',
  ].join('\n');
}
