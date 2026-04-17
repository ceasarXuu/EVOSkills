import { describe, expect, it } from 'vitest';
import { renderDashboardActivityListingSource } from '../../src/dashboard/web/activity/listing.js';

describe('renderDashboardActivityListingSource', () => {
  it('returns activity listing and column resize helpers', () => {
    const source = renderDashboardActivityListingSource();

    expect(source).toContain('function loadSavedActivityColumnWidths');
    expect(source).toContain('function buildScopeActivityRows');
    expect(source).toContain('function renderBusinessEvents');
    expect(source).toContain('function buildRawTraceRows');
  });
});
