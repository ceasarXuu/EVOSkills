import { describe, expect, it } from 'vitest';

import { resolveDashboardViewLayout } from '../../frontend-v3/src/lib/view-layout.ts';

describe('dashboard v3 view layout rules', () => {
  it('keeps the skills view focused on the skill workbench', () => {
    expect(resolveDashboardViewLayout('skills')).toEqual({
      showProjectRail: false,
      showHero: false,
      showMetrics: false,
      showProjectScopeBar: true,
    });
  });

  it('uses the project view for summary-heavy chrome', () => {
    expect(resolveDashboardViewLayout('projects')).toEqual({
      showProjectRail: true,
      showHero: true,
      showMetrics: true,
      showProjectScopeBar: false,
    });
  });

  it('keeps the activity view focused on the event stream', () => {
    expect(resolveDashboardViewLayout('activity')).toEqual({
      showProjectRail: true,
      showHero: false,
      showMetrics: false,
      showProjectScopeBar: false,
    });
  });
});
