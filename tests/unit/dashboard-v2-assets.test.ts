import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('dashboard v2 asset helpers', () => {
  const originalDistDir = process.env.ORNNSKILLS_DASHBOARD_V2_DIST_DIR;
  const cleanupPaths: string[] = [];

  afterEach(() => {
    process.env.ORNNSKILLS_DASHBOARD_V2_DIST_DIR = originalDistDir;
    while (cleanupPaths.length > 0) {
      const currentPath = cleanupPaths.pop();
      if (!currentPath) continue;
      rmSync(currentPath, { recursive: true, force: true });
    }
  });

  it('returns fallback html when no frontend build is present', async () => {
    const customRoot = mkdtempSync(join(tmpdir(), 'ornn-dashboard-v2-empty-'));
    cleanupPaths.push(customRoot);
    process.env.ORNNSKILLS_DASHBOARD_V2_DIST_DIR = customRoot;

    const { getDashboardV2DocumentResponse } = await import('../../src/dashboard/v2/assets.js');
    const document = getDashboardV2DocumentResponse();

    expect(document.hasBuild).toBe(false);
    expect(document.body).toContain('Preview build is not available yet.');
    expect(document.body).toContain('npm run build:dashboard-v2');
  });

  it('serves built html and static asset content from the configured dist root', async () => {
    const customRoot = mkdtempSync(join(tmpdir(), 'ornn-dashboard-v2-built-'));
    cleanupPaths.push(customRoot);
    mkdirSync(join(customRoot, 'assets'), { recursive: true });
    writeFileSync(join(customRoot, 'index.html'), '<html><body>dashboard v2</body></html>');
    writeFileSync(join(customRoot, 'assets', 'app.js'), 'console.log("v2")');
    process.env.ORNNSKILLS_DASHBOARD_V2_DIST_DIR = customRoot;

    const {
      getDashboardV2DocumentResponse,
      resolveDashboardV2StaticAsset,
    } = await import('../../src/dashboard/v2/assets.js');

    const document = getDashboardV2DocumentResponse();
    const asset = resolveDashboardV2StaticAsset('/v2/assets/app.js');

    expect(document.hasBuild).toBe(true);
    expect(document.body).toContain('dashboard v2');
    expect(asset?.contentType).toBe('application/javascript; charset=utf-8');
    expect(asset?.cacheControl).toContain('immutable');
    expect(asset?.body.toString('utf-8')).toContain('console.log("v2")');
  });

  it('rejects static asset traversal outside of the dist root', async () => {
    const customRoot = mkdtempSync(join(tmpdir(), 'ornn-dashboard-v2-safety-'));
    cleanupPaths.push(customRoot);
    mkdirSync(join(customRoot, 'assets'), { recursive: true });
    process.env.ORNNSKILLS_DASHBOARD_V2_DIST_DIR = customRoot;

    const { resolveDashboardV2StaticAsset } = await import('../../src/dashboard/v2/assets.js');
    expect(resolveDashboardV2StaticAsset('/v2/../../etc/passwd')).toBeNull();
  });
});
