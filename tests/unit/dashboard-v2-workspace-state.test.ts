import { describe, expect, it } from 'vitest';

import {
  DEFAULT_DASHBOARD_VIEW,
  isProjectSnapshotRefreshRequired,
  normalizeDashboardView,
  pickNextProject,
  type DashboardView,
} from '../../frontend/src/features/dashboard/workspace-state.ts';
import type { DashboardProject } from '../../frontend/src/types/dashboard.ts';

function project(
  path: string,
  overrides: Partial<DashboardProject> = {},
): DashboardProject {
  return {
    path,
    name: path.split('/').pop() ?? path,
    monitoringState: 'active',
    ...overrides,
  };
}

describe('dashboard v2 workspace state', () => {
  it('keeps the current project when it still exists', () => {
    const projects = [project('/alpha'), project('/beta')];

    expect(pickNextProject(projects, '/beta')).toBe('/beta');
  });

  it('falls back to the first active project when the current one disappears', () => {
    const projects = [
      project('/paused', { monitoringState: 'paused' }),
      project('/active-a'),
      project('/active-b'),
    ];

    expect(pickNextProject(projects, '/missing')).toBe('/active-a');
  });

  it('falls back to the first project when every project is paused', () => {
    const projects = [
      project('/paused-a', { monitoringState: 'paused' }),
      project('/paused-b', { monitoringState: 'paused' }),
    ];

    expect(pickNextProject(projects, '/missing')).toBe('/paused-a');
  });

  it('returns the default dashboard view for unsupported route segments', () => {
    expect(normalizeDashboardView('skills')).toBe<DashboardView>('skills');
    expect(normalizeDashboardView('')).toBe(DEFAULT_DASHBOARD_VIEW);
    expect(normalizeDashboardView('unknown')).toBe(DEFAULT_DASHBOARD_VIEW);
  });

  it('only refreshes the selected snapshot when the SSE payload marks it as changed', () => {
    expect(
      isProjectSnapshotRefreshRequired('/alpha', { changedProjects: ['/alpha', '/beta'] }),
    ).toBe(true);
    expect(
      isProjectSnapshotRefreshRequired('/alpha', { changedProjects: ['/beta'] }),
    ).toBe(false);
    expect(isProjectSnapshotRefreshRequired('', { changedProjects: ['/alpha'] })).toBe(false);
    expect(isProjectSnapshotRefreshRequired('/alpha', {})).toBe(false);
  });
});
