import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createDaemonStatusStore } from '../../src/core/daemon-status-store/index.js';

describe('daemon-status-store', () => {
  const projectRoot = join(tmpdir(), `ornn-daemon-status-${Date.now()}`);
  const checkpointPath = join(projectRoot, '.ornn', 'state', 'daemon-checkpoint.json');

  beforeEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('writes analyzing status with the active skill id', () => {
    const store = createDaemonStatusStore(projectRoot);

    store.setAnalyzing('test-skill');

    expect(existsSync(checkpointPath)).toBe(true);
    const checkpoint = JSON.parse(readFileSync(checkpointPath, 'utf-8')) as {
      optimizationStatus?: Record<string, unknown>;
    };
    expect(checkpoint.optimizationStatus).toMatchObject({
      currentState: 'analyzing',
      currentSkillId: 'test-skill',
      lastError: null,
      queueSize: 1,
    });
  });

  it('writes idle and error states using the canonical checkpoint shape', () => {
    const store = createDaemonStatusStore(projectRoot);

    store.setAnalyzing('test-skill');
    store.setIdle();
    store.setError('test-skill', 'invalid_analysis_json');

    const checkpoint = JSON.parse(readFileSync(checkpointPath, 'utf-8')) as {
      optimizationStatus?: Record<string, unknown>;
    };
    expect(checkpoint.optimizationStatus).toMatchObject({
      currentState: 'error',
      currentSkillId: 'test-skill',
      lastError: 'invalid_analysis_json',
      queueSize: 0,
    });
  });
});
