import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { getDashboardHtml } from '../../src/dashboard/ui.js';

type FakeElement = {
  id?: string;
  innerHTML: string;
  outerHTML: string;
  textContent: string;
  value: string;
  checked: boolean;
  disabled: boolean;
  placeholder?: string;
  selectionStart: number | null;
  selectionEnd: number | null;
  classList: {
    add: (...tokens: string[]) => void;
    remove: (...tokens: string[]) => void;
    toggle: (token: string, force?: boolean) => boolean;
    contains: (token: string) => boolean;
  };
  style: Record<string, string>;
  focus: () => void;
  addEventListener: (type: string, handler: (...args: unknown[]) => void) => void;
  setSelectionRange: (start: number, end: number) => void;
};

type FetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
};

function createFakeElement(id = ''): FakeElement {
  const classes = new Set<string>();
  return {
    id,
    innerHTML: '',
    outerHTML: '',
    textContent: '',
    value: '',
    checked: false,
    disabled: false,
    placeholder: '',
    selectionStart: null,
    selectionEnd: null,
    classList: {
      add: (...tokens: string[]) => {
        for (const token of tokens) classes.add(token);
      },
      remove: (...tokens: string[]) => {
        for (const token of tokens) classes.delete(token);
      },
      toggle: (token: string, force?: boolean) => {
        if (force === true) {
          classes.add(token);
          return true;
        }
        if (force === false) {
          classes.delete(token);
          return false;
        }
        if (classes.has(token)) {
          classes.delete(token);
          return false;
        }
        classes.add(token);
        return true;
      },
      contains: (token: string) => classes.has(token),
    },
    style: {},
    focus: () => undefined,
    addEventListener: () => undefined,
    setSelectionRange(start: number, end: number) {
      this.selectionStart = start;
      this.selectionEnd = end;
    },
  };
}

function createJsonResponse(payload: unknown): FetchResponse {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => payload,
  };
}

function loadDashboardHarness(
  fetchImpl: (url: string, init?: Record<string, unknown>) => Promise<FetchResponse>,
  options?: {
    initialStorage?: Record<string, string>;
  }
) {
  const html = getDashboardHtml(47432, 'zh', 'test-build-id');
  const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);
  if (!scriptMatch) {
    throw new Error('Dashboard script not found');
  }

  const elements = new Map<string, FakeElement>();
  const selectors = new Map<string, FakeElement>();
  const fetchCalls: string[] = [];
  const storage = new Map<string, string>(Object.entries(options?.initialStorage || {}));

  const ensureElement = (id: string) => {
    if (!elements.has(id)) {
      elements.set(id, createFakeElement(id));
    }
    return elements.get(id)!;
  };

  const document = {
    activeElement: null as FakeElement | null,
    documentElement: { lang: 'zh' },
    body: createFakeElement('body'),
    getElementById(id: string) {
      return ensureElement(id);
    },
    querySelector(selector: string) {
      if (!selectors.has(selector)) {
        selectors.set(selector, createFakeElement(selector));
      }
      return selectors.get(selector);
    },
    querySelectorAll(selector: string) {
      if (selector === '.lang-btn') {
        return [createFakeElement('lang-en'), createFakeElement('lang-zh')];
      }
      if (selector === '.modal-close') {
        return [createFakeElement('modal-close-1'), createFakeElement('modal-close-2')];
      }
      return [];
    },
  };

  const runtime = {
    document,
    window: {
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      location: {
        href: 'http://localhost/dashboard',
        search: '',
        reload: () => undefined,
      },
    },
    navigator: {
      userAgent: 'vitest',
      language: 'zh-CN',
      languages: ['zh-CN'],
      clipboard: {
        writeText: async () => undefined,
      },
    },
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, String(value));
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    },
    fetch: async (url: string, init?: Record<string, unknown>) => {
      fetchCalls.push(String(url));
      return fetchImpl(String(url), init);
    },
    console,
    alert: () => undefined,
    EventSource: class {
      addEventListener() {}
      close() {}
    },
    AbortController: class {
      signal = {};
      abort() {}
    },
    URLSearchParams,
    Intl,
    Date,
    Math,
    JSON,
    setTimeout,
    clearTimeout,
    globalThis: null as unknown,
  };
  runtime.globalThis = runtime;

  const script = scriptMatch[1]
    .replace(/\binit\(\);\s*$/, '')
    .concat('\n;globalThis.__dashboardTest = { state, init, handleUpdate };');

  vm.runInNewContext(script, runtime);

  return {
    dashboard: (
      runtime as typeof runtime & {
        __dashboardTest: {
          state: Record<string, any>;
          init: () => Promise<void>;
          handleUpdate: (data: Record<string, unknown>) => Promise<void>;
        };
      }
    ).__dashboardTest,
    getFetchCalls() {
      return fetchCalls.slice();
    },
    clearFetchCalls() {
      fetchCalls.length = 0;
    },
    getStorageItem(key: string) {
      return storage.get(key) ?? null;
    },
  };
}

async function flushAsync(times = 4): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe('dashboard ui live refresh', () => {
  it('keeps skill-library live refresh off the full project snapshot path', async () => {
    const projectPath = '/tmp/ornn-project';
    const encodedProjectPath = encodeURIComponent(projectPath);
    const skillId = 'test-driven-development';
    const familyId = 'family-1';
    const instanceId = 'instance-1';
    const encodedFamilyId = encodeURIComponent(familyId);
    const encodedSkillId = encodeURIComponent(skillId);
    let snapshotFetches = 0;

    const harness = loadDashboardHarness(async (url) => {
      if (url === '/api/projects') {
        return createJsonResponse({
          projects: [{ path: projectPath, name: 'OrnnSkills', isRunning: true, skillCount: 1 }],
        });
      }

      if (url === '/api/logs') {
        return createJsonResponse({ lines: [] });
      }

      if (url === '/api/dashboard/runtime') {
        return createJsonResponse({ buildId: 'test-build-id', pid: 1 });
      }

      if (url === '/api/lang') {
        return createJsonResponse({ ok: true, lang: 'zh' });
      }

      if (url === `/api/projects/${encodedProjectPath}/snapshot`) {
        snapshotFetches += 1;
        return createJsonResponse({
          daemon: {
            isRunning: true,
            isPaused: false,
            monitoringState: 'active',
            pausedAt: null,
            pid: 1,
            startedAt: '2026-04-10T00:00:00.000Z',
            processedTraces: snapshotFetches,
            lastCheckpointAt: null,
            retryQueueSize: 0,
            optimizationStatus: {
              currentState: 'idle',
              currentSkillId: null,
              lastOptimizationAt: null,
              lastError: null,
              queueSize: 0,
            },
          },
          skills: [
            {
              skillId,
              runtime: 'codex',
              status: 'active',
              updatedAt: '2026-04-10T00:00:00.000Z',
              traceCount: 1,
              versionsAvailable: [1],
              effectiveVersion: 1,
            },
          ],
          skillGroups: [],
          skillInstances: [
            {
              instanceId,
              familyId,
              familyName: skillId,
              skillKey: `${skillId}:codex`,
              projectId: 'project-1',
              projectPath,
              skillId,
              runtime: 'codex',
              status: 'active',
              lastUsedAt: '2026-04-10T00:00:00.000Z',
              effectiveVersion: 1,
            },
          ],
          traceStats: { total: 1, byRuntime: { codex: 1 }, byStatus: { success: 1 }, byEventType: {} },
          recentTraces: [],
          decisionEvents: [],
          activityScopes: [],
          agentUsage: {
            callCount: 1,
            promptTokens: 10,
            completionTokens: 5,
            totalTokens: 15,
            durationMsTotal: 100,
            avgDurationMs: 100,
            lastCallAt: '2026-04-10T00:00:00.000Z',
            byModel: {},
            byScope: {},
            bySkill: {},
          },
        });
      }

      if (url === '/api/skills/families') {
        return createJsonResponse({
          families: [
            {
              familyId,
              familyName: skillId,
              runtimes: ['codex'],
              instanceCount: 1,
              projectCount: 1,
              runtimeCount: 1,
              status: 'active',
              lastSeenAt: '2026-04-10T00:00:00.000Z',
              usage: { observedCalls: 1 },
            },
          ],
        });
      }

      if (url === `/api/skills/families/${encodedFamilyId}`) {
        return createJsonResponse({
          family: {
            familyId,
            familyName: skillId,
            runtimes: ['codex'],
            instanceCount: 1,
            projectCount: 1,
            runtimeCount: 1,
            status: 'active',
            lastSeenAt: '2026-04-10T00:00:00.000Z',
            usage: { observedCalls: 1 },
          },
        });
      }

      if (url === `/api/skills/families/${encodedFamilyId}/instances`) {
        return createJsonResponse({
          instances: [
            {
              instanceId,
              familyId,
              familyName: skillId,
              projectPath,
              skillId,
              runtime: 'codex',
              status: 'active',
              effectiveVersion: 1,
              lastUsedAt: '2026-04-10T00:00:00.000Z',
            },
          ],
        });
      }

      if (url === `/api/projects/${encodedProjectPath}/skill-instances`) {
        return createJsonResponse({
          instances: [
            {
              instanceId,
              familyId,
              familyName: skillId,
              projectPath,
              skillId,
              runtime: 'codex',
              status: 'active',
              effectiveVersion: 1,
              lastUsedAt: '2026-04-10T00:00:00.000Z',
            },
          ],
        });
      }

      if (url === `/api/projects/${encodedProjectPath}/skills/${encodedSkillId}?runtime=codex`) {
        return createJsonResponse({
          content: 'Skill content',
          versions: [],
          effectiveVersion: 1,
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    await harness.dashboard.init();
    await flushAsync();

    expect(harness.dashboard.state.selectedMainTab).toBe('skills');
    expect(harness.dashboard.state.selectedSkillFamilyId).toBe(familyId);
    expect(snapshotFetches).toBeGreaterThan(0);

    const snapshotUrl = `/api/projects/${encodedProjectPath}/snapshot`;
    const baselineSnapshotFetches = snapshotFetches;
    harness.clearFetchCalls();

    await harness.dashboard.handleUpdate({ changedProjects: [projectPath] });
    await flushAsync();

    expect(harness.getFetchCalls()).not.toContain(snapshotUrl);
    expect(snapshotFetches).toBe(baselineSnapshotFetches);
    expect(harness.getFetchCalls()).toContain('/api/skills/families');
    expect(harness.dashboard.state.staleProjectData[projectPath]).toBe(true);
  });

  it('hydrates dashboard bootstrap cache before the first network round-trip finishes', async () => {
    const projectPath = '/tmp/cached-project';
    const familyId = 'family-1';
    let resolveProjectsResponse: ((value: FetchResponse) => void) | null = null;

    const harness = loadDashboardHarness(
      async (url) => {
        if (url === '/api/projects') {
          return await new Promise<FetchResponse>((resolve) => {
            resolveProjectsResponse = resolve;
          });
        }

        if (url === '/api/logs') {
          return createJsonResponse({ lines: [] });
        }

        if (url === '/api/dashboard/runtime') {
          return createJsonResponse({ buildId: 'test-build-id', pid: 1 });
        }

        if (url === '/api/lang') {
          return createJsonResponse({ ok: true, lang: 'zh' });
        }

        return createJsonResponse({});
      },
      {
        initialStorage: {
          'ornn-dashboard-bootstrap-cache': JSON.stringify({
            version: 1,
            buildId: 'test-build-id',
            cachedAt: '2026-04-21T00:00:00.000Z',
            ui: {
              selectedProjectId: projectPath,
              selectedMainTab: 'skills',
              selectedSkillFamilyId: familyId,
              selectedRuntimeTab: 'all',
              searchQuery: '',
              sortBy: 'name',
              sortOrder: 'asc',
            },
            projects: [{ path: projectPath, name: 'Cached Project', isRunning: true, skillCount: 1 }],
            selectedProjectSnapshot: {
              projectPath,
              snapshot: {
                daemon: { isRunning: true, processedTraces: 7 },
                skills: [{ skillId: 'cached-skill', runtime: 'codex', status: 'active' }],
                skillGroups: [],
                skillInstances: [],
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
              },
            },
            skillLibrary: {
              families: [{ familyId, familyName: 'cached-skill', runtimes: ['codex'] }],
              selectedFamilyId: familyId,
              family: { familyId, familyName: 'cached-skill', runtimes: ['codex'] },
              instances: [{ instanceId: 'instance-1', familyId, projectPath, runtime: 'codex' }],
            },
          }),
        },
      }
    );

    const initPromise = harness.dashboard.init();

    expect(harness.dashboard.state.projects).toEqual([
      { path: projectPath, name: 'Cached Project', isRunning: true, skillCount: 1 },
    ]);
    expect(harness.dashboard.state.selectedProjectId).toBe(projectPath);
    expect(harness.dashboard.state.projectData[projectPath]?.daemon?.processedTraces).toBe(7);
    expect(harness.dashboard.state.skillFamilies).toEqual([
      { familyId, familyName: 'cached-skill', runtimes: ['codex'] },
    ]);
    expect(harness.dashboard.state.selectedSkillFamilyId).toBe(familyId);
    expect(harness.getFetchCalls()).toContain('/api/projects');

    resolveProjectsResponse?.(
      createJsonResponse({
        projects: [{ path: projectPath, name: 'Fresh Project', isRunning: true, skillCount: 2 }],
      })
    );

    await initPromise;

    expect(harness.dashboard.state.projects).toEqual([
      { path: projectPath, name: 'Fresh Project', isRunning: true, skillCount: 2 },
    ]);
  });
});
