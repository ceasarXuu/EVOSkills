import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  readCheckpointStats,
  readOptimizationStats,
} from '../../src/cli/commands/daemon/status-reader.js';

describe('daemon status reader', () => {
  const testRoot = join(tmpdir(), `ornn-daemon-status-${Date.now()}`);

  const writeCheckpoint = (payload: Record<string, unknown>) => {
    const stateDir = join(testRoot, '.ornn', 'state');
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      join(stateDir, 'daemon-checkpoint.json'),
      JSON.stringify(payload, null, 2),
      'utf-8'
    );
  };

  it('reads processed traces and snake_case timestamps from checkpoint files', () => {
    writeCheckpoint({
      processedTraces: 12,
      started_at: '2026-04-10T00:00:00.000Z',
    });

    expect(readCheckpointStats(testRoot)).toEqual({
      processedTraces: 12,
      startedAt: '2026-04-10T00:00:00.000Z',
    });
  });

  it('reads optimization status blocks when present', () => {
    writeCheckpoint({
      optimizationStatus: {
        currentState: 'analyzing',
        currentSkillId: 'skill-a',
        lastOptimizationAt: '2026-04-10T00:05:00.000Z',
        lastError: null,
        queueSize: 3,
      },
    });

    expect(readOptimizationStats(testRoot)).toEqual({
      currentState: 'analyzing',
      currentSkillId: 'skill-a',
      lastOptimizationAt: '2026-04-10T00:05:00.000Z',
      lastError: null,
      queueSize: 3,
    });
  });

  it('returns null when the checkpoint file is absent or invalid', () => {
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true });
    }
    expect(readCheckpointStats(testRoot)).toBeNull();
    expect(readOptimizationStats(testRoot)).toBeNull();

    const stateDir = join(testRoot, '.ornn', 'state');
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, 'daemon-checkpoint.json'), '{invalid-json', 'utf-8');

    expect(readCheckpointStats(testRoot)).toBeNull();
    expect(readOptimizationStats(testRoot)).toBeNull();
  });
});