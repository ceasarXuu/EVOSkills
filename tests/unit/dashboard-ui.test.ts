import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { getDashboardHtml } from '../../src/dashboard/ui.js';

type FakeElement = {
  id?: string;
  innerHTML: string;
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
    toggle: (...tokens: string[]) => boolean;
    contains: (...tokens: string[]) => boolean;
  };
  style: Record<string, string>;
  focus: () => void;
  addEventListener: (type: string, handler: (...args: unknown[]) => void) => void;
  setSelectionRange: (start: number, end: number) => void;
};

function createFakeElement(id = ''): FakeElement {
  return {
    id,
    innerHTML: '',
    textContent: '',
    value: '',
    checked: false,
    disabled: false,
    placeholder: '',
    selectionStart: null,
    selectionEnd: null,
    classList: {
      add: () => undefined,
      remove: () => undefined,
      toggle: () => false,
      contains: () => false,
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

function loadDashboardTestHarness(storageSeed: Record<string, string> = {}) {
  const html = getDashboardHtml(47432, 'zh', 'test-build-id');
  const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);
  if (!scriptMatch) {
    throw new Error('Dashboard script not found');
  }

  const elements = new Map<string, FakeElement>();
  const selectorMap = new Map<string, FakeElement>();
  const localStorageData = new Map<string, string>(Object.entries(storageSeed));
  let copiedText = '';

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
      if (!selectorMap.has(selector)) {
        selectorMap.set(selector, createFakeElement(selector));
      }
      return selectorMap.get(selector);
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
      clipboard: {
        writeText: async (text: string) => {
          copiedText = text;
        },
      },
    },
    localStorage: {
      getItem(key: string) {
        return localStorageData.has(key) ? localStorageData.get(key)! : null;
      },
      setItem(key: string, value: string) {
        localStorageData.set(key, value);
      },
    },
    fetch: async () => ({
      ok: true,
      json: async () => ({ buildId: 'test-build-id', projects: [], providers: [] }),
    }),
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
    .concat(
      '\n;globalThis.__dashboardTest = { state, renderMainPanel, buildActivityRows, copyActivityDetail, openActivityDetail, renderCostPanel };'
    );

  vm.runInNewContext(script, runtime);

  return {
    dashboard: (runtime as typeof runtime & {
      __dashboardTest: {
        state: Record<string, any>;
        renderMainPanel: (projectPath: string) => void;
        buildActivityRows: (projectPath: string) => Array<Record<string, any>>;
        copyActivityDetail: (projectPath: string, rowId: string) => Promise<void>;
        openActivityDetail: (projectPath: string, rowId: string) => Promise<void>;
        renderCostPanel: (projectPath: string) => string;
      };
    }).__dashboardTest,
    getElement(id: string) {
      return ensureElement(id);
    },
    getCopiedText() {
      return copiedText;
    },
  };
}

describe('dashboard ui recovery', () => {
  it('renders a cost tab with estimated spend and LiteLLM model metadata', () => {
    const { dashboard, getElement } = loadDashboardTestHarness();
    const projectPath = '/tmp/ornn-project';

    getElement('mainPanel');
    dashboard.state.selectedMainTab = 'cost';
    dashboard.state.selectedProjectId = projectPath;
    dashboard.state.providerCatalog = [{
      id: 'deepseek',
      name: 'deepseek',
      models: ['deepseek/deepseek-reasoner'],
      modelDetails: [{
        id: 'deepseek/deepseek-reasoner',
        mode: 'chat',
        maxInputTokens: 64000,
        maxOutputTokens: 8000,
        inputCostPerToken: 0.00000055,
        outputCostPerToken: 0.00000219,
        supportsReasoning: true,
        supportsFunctionCalling: true,
        supportsPromptCaching: false,
        supportsStructuredOutput: true,
        supportsVision: false,
        supportsWebSearch: false,
      }],
      defaultModel: 'deepseek/deepseek-reasoner',
      apiKeyEnvVar: 'DEEPSEEK_API_KEY',
    }];
    dashboard.state.projectData = {
      [projectPath]: {
        daemon: {},
        skills: [],
        traceStats: { total: 0, byRuntime: {}, byStatus: {}, byEventType: {} },
        recentTraces: [],
        decisionEvents: [],
        agentUsage: {
          callCount: 3,
          promptTokens: 1000,
          completionTokens: 250,
          totalTokens: 1250,
          byModel: {
            'deepseek/deepseek-reasoner': {
              callCount: 3,
              promptTokens: 1000,
              completionTokens: 250,
              totalTokens: 1250,
            },
          },
          byScope: {
            skill_call_analyzer: {
              callCount: 2,
              promptTokens: 900,
              completionTokens: 200,
              totalTokens: 1100,
            },
          },
        },
      },
    };

    dashboard.renderMainPanel(projectPath);
    const html = getElement('mainPanel').innerHTML;
    expect(html).toContain('成本');
    expect(html).toContain('deepseek/deepseek-reasoner');
    expect(html).toContain('推理');
    expect(html).toContain('$0.0011');
  });

  it('renders copy and detail actions for activity rows and copies readable detail text', async () => {
    const { dashboard, getElement, getCopiedText } = loadDashboardTestHarness();
    const projectPath = '/tmp/ornn-project';

    getElement('mainPanel');
    getElement('eventModalTitle');
    getElement('eventModalContent');
    getElement('eventModal');

    dashboard.state.selectedMainTab = 'activity';
    dashboard.state.selectedProjectId = projectPath;
    dashboard.state.projectData = {
      [projectPath]: {
        daemon: {},
        skills: [{ skillId: 'test-driven-development', runtime: 'codex' }],
        traceStats: { total: 0, byRuntime: {}, byStatus: {}, byEventType: {} },
        recentTraces: [],
        decisionEvents: [{
          id: 'evt-1',
          timestamp: '2026-04-10T05:23:00.000Z',
          tag: 'evaluation_result',
          runtime: 'codex',
          skillId: 'test-driven-development',
          status: 'no_patch_needed',
          windowId: 'scope-123',
          detail: '系统已经完成本轮分析。',
        }],
        agentUsage: { callCount: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, byModel: {}, byScope: {} },
      },
    };

    dashboard.renderMainPanel(projectPath);
    const html = getElement('mainPanel').innerHTML;
    expect(html).toContain('复制');
    expect(html).toContain('查看详情');

    await dashboard.copyActivityDetail(projectPath, 'decision:evt-1');
    expect(getCopiedText()).toContain('test-driven-development');
    expect(getCopiedText()).toContain('scope-123');

    await dashboard.openActivityDetail(projectPath, 'decision:evt-1');
    expect(getElement('eventModalContent').textContent).toContain('系统已经完成本轮分析。');
  });

  it('backfills skill_called scope ids from related decision events on the same trace', () => {
    const { dashboard } = loadDashboardTestHarness();
    const projectPath = '/tmp/ornn-project';

    dashboard.state.projectData = {
      [projectPath]: {
        daemon: {},
        skills: [{ skillId: 'test-driven-development', runtime: 'codex' }],
        traceStats: { total: 1, byRuntime: { codex: 1 }, byStatus: { success: 1 }, byEventType: { tool_call: 1 } },
        recentTraces: [{
          trace_id: 'trace-1',
          session_id: 'session-1',
          runtime: 'codex',
          timestamp: '2026-04-10T05:23:00.000Z',
          event_type: 'tool_call',
          skill_refs: ['test-driven-development'],
          status: 'success',
        }],
        decisionEvents: [{
          id: 'evt-1',
          timestamp: '2026-04-10T05:23:01.000Z',
          tag: 'evaluation_result',
          traceId: 'trace-1',
          sessionId: 'session-1',
          runtime: 'codex',
          skillId: 'test-driven-development',
          status: 'no_patch_needed',
          windowId: 'scope-trace-1',
          detail: 'same trace scope',
        }],
        agentUsage: { callCount: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, byModel: {}, byScope: {} },
      },
    };

    const rows = dashboard.buildActivityRows(projectPath);
    const traceRow = rows.find((row) => row.tag === 'skill_called');
    expect(traceRow?.scopeId).toBe('scope-trace-1');
  });

  it('filters out unknown skill refs such as repo-x from the business activity table', () => {
    const { dashboard } = loadDashboardTestHarness();
    const projectPath = '/tmp/ornn-project';

    dashboard.state.projectData = {
      [projectPath]: {
        daemon: {},
        skills: [{ skillId: 'test-driven-development', runtime: 'codex' }],
        traceStats: { total: 1, byRuntime: { codex: 1 }, byStatus: { success: 1 }, byEventType: { tool_call: 1 } },
        recentTraces: [{
          trace_id: 'trace-1',
          session_id: 'session-1',
          runtime: 'codex',
          timestamp: '2026-04-10T05:23:00.000Z',
          event_type: 'tool_call',
          skill_refs: ['repo-x'],
          status: 'success',
        }],
        decisionEvents: [],
        agentUsage: { callCount: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, byModel: {}, byScope: {} },
      },
    };

    const rows = dashboard.buildActivityRows(projectPath);
    expect(rows.find((row) => row.skillId === 'repo-x')).toBeUndefined();
  });

  it('deduplicates repeated decision conclusions within the same short window', () => {
    const { dashboard } = loadDashboardTestHarness({
      'ornn-dashboard-activity-columns': JSON.stringify({ detail: 640 }),
    });
    const projectPath = '/tmp/ornn-project';

    dashboard.state.projectData = {
      [projectPath]: {
        daemon: {},
        skills: [{ skillId: 'test-driven-development', runtime: 'codex' }],
        traceStats: { total: 0, byRuntime: {}, byStatus: {}, byEventType: {} },
        recentTraces: [],
        decisionEvents: [
          {
            id: 'evt-1',
            timestamp: '2026-04-10T05:23:00.000Z',
            tag: 'skill_feedback',
            runtime: 'codex',
            skillId: 'test-driven-development',
            status: 'no_patch_needed',
            windowId: 'scope-1',
            detail: 'same conclusion',
          },
          {
            id: 'evt-2',
            timestamp: '2026-04-10T05:23:05.000Z',
            tag: 'skill_feedback',
            runtime: 'codex',
            skillId: 'test-driven-development',
            status: 'no_patch_needed',
            windowId: 'scope-1',
            detail: 'same conclusion',
          },
          {
            id: 'evt-3',
            timestamp: '2026-04-10T05:23:25.000Z',
            tag: 'skill_feedback',
            runtime: 'codex',
            skillId: 'test-driven-development',
            status: 'no_patch_needed',
            windowId: 'scope-1',
            detail: 'same conclusion',
          },
        ],
        agentUsage: { callCount: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, byModel: {}, byScope: {} },
      },
    };

    const rows = dashboard.buildActivityRows(projectPath);
    expect(rows.filter((row) => row.tag === 'skill_feedback')).toHaveLength(2);
  });

  it('uses persisted activity column widths when rendering the table', () => {
    const { dashboard, getElement } = loadDashboardTestHarness({
      'ornn-dashboard-activity-columns': JSON.stringify({ detail: 640 }),
    });
    const projectPath = '/tmp/ornn-project';

    getElement('mainPanel');
    dashboard.state.selectedMainTab = 'activity';
    dashboard.state.selectedProjectId = projectPath;
    dashboard.state.projectData = {
      [projectPath]: {
        daemon: {},
        skills: [{ skillId: 'test-driven-development', runtime: 'codex' }],
        traceStats: { total: 1, byRuntime: { codex: 1 }, byStatus: { success: 1 }, byEventType: { tool_call: 1 } },
        recentTraces: [{
          trace_id: 'trace-1',
          session_id: 'session-1',
          runtime: 'codex',
          timestamp: '2026-04-10T05:23:00.000Z',
          event_type: 'tool_call',
          skill_refs: ['test-driven-development'],
          status: 'success',
        }],
        decisionEvents: [],
        agentUsage: { callCount: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, byModel: {}, byScope: {} },
      },
    };

    dashboard.renderMainPanel(projectPath);
    expect(getElement('mainPanel').innerHTML).toContain('width:640px');
  });
});
