import { describe, expect, it } from 'vitest';

describe('dashboard bootstrap cache helpers', () => {
  it('creates a versioned bootstrap cache record for the current build', async () => {
    const {
      DASHBOARD_BOOTSTRAP_CACHE_STORAGE_KEY,
      DASHBOARD_BOOTSTRAP_CACHE_TTL_MS,
      DASHBOARD_BOOTSTRAP_CACHE_VERSION,
      createDashboardBootstrapCacheRecord,
    } = await import('../../src/dashboard/web/bootstrap-cache.js');

    const record = createDashboardBootstrapCacheRecord({
      buildId: 'build-1',
      cachedAt: '2026-04-21T00:00:00.000Z',
      ui: {
        selectedProjectId: '/tmp/demo',
        selectedMainTab: 'skills',
        selectedSkillFamilyId: 'family-1',
        selectedRuntimeTab: 'codex',
        selectedConfigSubTab: 'evolution',
        searchQuery: 'demo',
        sortBy: 'updated',
        sortOrder: 'desc',
      },
      projects: [{ path: '/tmp/demo', name: 'Demo' }],
      selectedProjectSnapshot: {
        projectPath: '/tmp/demo',
        snapshot: { daemon: { isRunning: true }, skills: [] },
      },
      skillLibrary: {
        families: [{ familyId: 'family-1', familyName: 'demo-skill' }],
        selectedFamilyId: 'family-1',
        family: { familyId: 'family-1', familyName: 'demo-skill' },
        instances: [{ instanceId: 'instance-1' }],
      },
    });

    expect(DASHBOARD_BOOTSTRAP_CACHE_STORAGE_KEY).toBe('ornn-dashboard-bootstrap-cache');
    expect(DASHBOARD_BOOTSTRAP_CACHE_VERSION).toBe(1);
    expect(DASHBOARD_BOOTSTRAP_CACHE_TTL_MS).toBe(30 * 60 * 1000);
    expect(record).toEqual({
      version: 1,
      buildId: 'build-1',
      cachedAt: '2026-04-21T00:00:00.000Z',
      ui: {
        selectedProjectId: '/tmp/demo',
        selectedMainTab: 'skills',
        selectedSkillFamilyId: 'family-1',
        selectedRuntimeTab: 'codex',
        selectedConfigSubTab: 'evolution',
        searchQuery: 'demo',
        sortBy: 'updated',
        sortOrder: 'desc',
      },
      projects: [{ path: '/tmp/demo', name: 'Demo' }],
      selectedProjectSnapshot: {
        projectPath: '/tmp/demo',
        snapshot: { daemon: { isRunning: true }, skills: [] },
      },
      skillLibrary: {
        families: [{ familyId: 'family-1', familyName: 'demo-skill' }],
        selectedFamilyId: 'family-1',
        family: { familyId: 'family-1', familyName: 'demo-skill' },
        instances: [{ instanceId: 'instance-1' }],
      },
    });
  });

  it('rejects stale or mismatched bootstrap cache records and normalizes invalid selections', async () => {
    const { restoreDashboardBootstrapCacheRecord } = await import('../../src/dashboard/web/bootstrap-cache.js');

    expect(
      restoreDashboardBootstrapCacheRecord(
        {
          version: 1,
          buildId: 'old-build',
          cachedAt: '2026-04-21T00:00:00.000Z',
          ui: {},
          projects: [],
          selectedProjectSnapshot: null,
          skillLibrary: null,
        },
        {
          buildId: 'new-build',
          nowMs: Date.parse('2026-04-21T00:10:00.000Z'),
        }
      )
    ).toBeNull();

    expect(
      restoreDashboardBootstrapCacheRecord(
        {
          version: 1,
          buildId: 'build-1',
          cachedAt: '2026-04-20T00:00:00.000Z',
          ui: {},
          projects: [],
          selectedProjectSnapshot: null,
          skillLibrary: null,
        },
        {
          buildId: 'build-1',
          nowMs: Date.parse('2026-04-21T00:40:01.000Z'),
        }
      )
    ).toBeNull();

    expect(
      restoreDashboardBootstrapCacheRecord(
        {
          version: 1,
          buildId: 'build-1',
          cachedAt: '2026-04-21T00:00:00.000Z',
          ui: {
            selectedProjectId: '/tmp/missing',
            selectedMainTab: 'unknown',
            selectedSkillFamilyId: 'family-missing',
            selectedRuntimeTab: 'weird-runtime',
            selectedConfigSubTab: 'unknown',
            searchQuery: 42,
            sortBy: 'bad',
            sortOrder: 'bad',
          },
          projects: [{ path: '/tmp/demo', name: 'Demo' }],
          selectedProjectSnapshot: {
            projectPath: '/tmp/missing',
            snapshot: { daemon: { isRunning: true } },
          },
          skillLibrary: {
            families: [{ familyId: 'family-1', familyName: 'demo-skill' }],
            selectedFamilyId: 'family-missing',
            family: { familyId: 'family-1', familyName: 'demo-skill' },
            instances: [{ instanceId: 'instance-1' }],
          },
        },
        {
          buildId: 'build-1',
          nowMs: Date.parse('2026-04-21T00:10:00.000Z'),
        }
      )
    ).toEqual({
      version: 1,
      buildId: 'build-1',
      cachedAt: '2026-04-21T00:00:00.000Z',
      ui: {
        selectedProjectId: '/tmp/demo',
        selectedMainTab: 'skills',
        selectedSkillFamilyId: 'family-1',
        selectedRuntimeTab: 'all',
        selectedConfigSubTab: 'model',
        searchQuery: '',
        sortBy: 'name',
        sortOrder: 'asc',
      },
      projects: [{ path: '/tmp/demo', name: 'Demo' }],
      selectedProjectSnapshot: null,
      skillLibrary: {
        families: [{ familyId: 'family-1', familyName: 'demo-skill' }],
        selectedFamilyId: 'family-1',
        family: { familyId: 'family-1', familyName: 'demo-skill' },
        instances: [{ instanceId: 'instance-1' }],
      },
    });
  });
});
