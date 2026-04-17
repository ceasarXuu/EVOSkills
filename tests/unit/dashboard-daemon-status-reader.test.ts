import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readDaemonStatus } from '../../src/dashboard/readers/daemon-status-reader.js';

describe('dashboard daemon status reader', () => {
  const testDir = join(tmpdir(), `ornn-dashboard-daemon-status-reader-${Date.now()}`);

  beforeEach(() => {
    mkdirSync(join(testDir, '.ornn', 'state'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('backfills analyzing state, processed traces, last optimization, and last error', () => {
    const oldHome = process.env.HOME;
    const fakeHome = join(testDir, 'home-active');
    mkdirSync(join(fakeHome, '.ornn'), { recursive: true });
    process.env.HOME = fakeHome;

    try {
      writeFileSync(join(fakeHome, '.ornn', 'daemon.pid'), String(process.pid), 'utf-8');
      writeFileSync(
        join(fakeHome, '.ornn', 'projects.json'),
        JSON.stringify({
          projects: [
            {
              path: testDir,
              name: 'test-project',
              registeredAt: '2026-04-17T09:00:00.000Z',
              lastSeenAt: '2026-04-17T09:10:00.000Z',
              monitoringState: 'active',
              pausedAt: null,
            },
          ],
        }),
        'utf-8'
      );
      writeFileSync(
        join(testDir, '.ornn', 'state', 'daemon-checkpoint.json'),
        JSON.stringify({
          startedAt: '2026-04-17T09:00:00.000Z',
          processedTraces: 0,
          lastCheckpointAt: '2026-04-17T09:05:00.000Z',
          retryQueueSize: 2,
          optimizationStatus: {
            currentState: 'idle',
            currentSkillId: null,
            lastOptimizationAt: null,
            lastError: null,
            queueSize: 0,
          },
        }),
        'utf-8'
      );
      writeFileSync(
        join(testDir, '.ornn', 'state', 'task-episodes.json'),
        JSON.stringify({
          updatedAt: '2026-04-17T09:06:00.000Z',
          episodes: [
            {
              episodeId: 'episode-1',
              state: 'analyzing',
              analysisStatus: 'running',
              skillSegments: [{ skillId: 'systematic-debugging' }],
            },
          ],
        }),
        'utf-8'
      );
      writeFileSync(
        join(testDir, '.ornn', 'state', 'decision-events.ndjson'),
        [
          JSON.stringify({
            id: 'evt-1',
            timestamp: '2026-04-17T09:03:00.000Z',
            tag: 'patch_applied',
          }),
          JSON.stringify({
            id: 'evt-2',
            timestamp: '2026-04-17T09:04:00.000Z',
            tag: 'analysis_failed',
            detail: 'network unstable',
          }),
        ].join('\n') + '\n',
        'utf-8'
      );
      writeFileSync(
        join(testDir, '.ornn', 'state', 'session-a.ndjson'),
        [
          JSON.stringify({
            trace_id: 'trace-1',
            runtime: 'codex',
            session_id: 'session-a',
            turn_id: 'turn-1',
            event_type: 'tool_call',
            timestamp: '2026-04-17T09:01:00.000Z',
            status: 'success',
          }),
          JSON.stringify({
            trace_id: 'trace-2',
            runtime: 'codex',
            session_id: 'session-a',
            turn_id: 'turn-2',
            event_type: 'tool_result',
            timestamp: '2026-04-17T09:02:00.000Z',
            status: 'success',
          }),
        ].join('\n') + '\n',
        'utf-8'
      );

      expect(readDaemonStatus(testDir)).toMatchObject({
        isRunning: true,
        isPaused: false,
        monitoringState: 'active',
        processedTraces: 2,
        optimizationStatus: {
          currentState: 'analyzing',
          currentSkillId: 'systematic-debugging',
          lastOptimizationAt: '2026-04-17T09:03:00.000Z',
          lastError: 'network unstable',
          queueSize: 1,
        },
      });
    } finally {
      process.env.HOME = oldHome;
    }
  });

  it('forces paused projects to idle even when checkpoint says running', () => {
    const oldHome = process.env.HOME;
    const fakeHome = join(testDir, 'home-paused');
    mkdirSync(join(fakeHome, '.ornn'), { recursive: true });
    process.env.HOME = fakeHome;

    try {
      writeFileSync(join(fakeHome, '.ornn', 'daemon.pid'), String(process.pid), 'utf-8');
      writeFileSync(
        join(fakeHome, '.ornn', 'projects.json'),
        JSON.stringify({
          projects: [
            {
              path: testDir,
              name: 'test-project',
              registeredAt: '2026-04-17T09:00:00.000Z',
              lastSeenAt: '2026-04-17T09:30:00.000Z',
              monitoringState: 'paused',
              pausedAt: '2026-04-17T09:30:00.000Z',
            },
          ],
        }),
        'utf-8'
      );
      writeFileSync(
        join(testDir, '.ornn', 'state', 'daemon-checkpoint.json'),
        JSON.stringify({
          startedAt: '2026-04-17T09:00:00.000Z',
          processedTraces: 5,
          optimizationStatus: {
            currentState: 'optimizing',
            currentSkillId: 'show-my-repo',
            lastOptimizationAt: '2026-04-17T09:20:00.000Z',
            lastError: 'stale error',
            queueSize: 3,
          },
        }),
        'utf-8'
      );

      expect(readDaemonStatus(testDir)).toMatchObject({
        isRunning: false,
        isPaused: true,
        monitoringState: 'paused',
        pausedAt: '2026-04-17T09:30:00.000Z',
        optimizationStatus: {
          currentState: 'idle',
          currentSkillId: null,
          lastOptimizationAt: '2026-04-17T09:20:00.000Z',
          lastError: null,
          queueSize: 0,
        },
      });
    } finally {
      process.env.HOME = oldHome;
    }
  });
});
