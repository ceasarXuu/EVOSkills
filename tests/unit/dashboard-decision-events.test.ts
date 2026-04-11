import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readAgentUsageStats, readDaemonStatus, readProjectSnapshot, readRecentDecisionEvents } from '../../src/dashboard/data-reader.js';

const testRoots: string[] = [];

afterEach(() => {
  for (const root of testRoots) {
    if (existsSync(root)) {
      rmSync(root, { recursive: true, force: true });
    }
  }
  testRoots.length = 0;
});

describe('dashboard decision event reader', () => {
  it('reads recent decision events from project state', () => {
    const projectRoot = join(tmpdir(), `ornn-dashboard-decisions-${Date.now()}`);
    testRoots.push(projectRoot);
    mkdirSync(join(projectRoot, '.ornn', 'state'), { recursive: true });

    writeFileSync(
      join(projectRoot, '.ornn', 'state', 'decision-events.ndjson'),
      [
        JSON.stringify({
          id: 'evt-1',
          timestamp: '2026-04-09T12:00:00.000Z',
          tag: 'analysis_requested',
          skillId: 'systematic-debugging',
          runtime: 'codex',
          status: 'pending',
          detail: 'probe says ready',
        }),
        JSON.stringify({
          id: 'evt-2',
          timestamp: '2026-04-09T12:01:00.000Z',
          tag: 'skill_evaluation',
          skillId: 'systematic-debugging',
          runtime: 'codex',
          status: 'no_patch_needed',
          detail: 'not enough evidence',
          confidence: 0.61,
          changeType: null,
          reason: 'No patch needed',
        }),
      ].join('\n') + '\n',
      'utf-8'
    );

    const events = readRecentDecisionEvents(projectRoot);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      id: 'evt-2',
      tag: 'skill_evaluation',
      skillId: 'systematic-debugging',
      status: 'no_patch_needed',
      confidence: 0.61,
    });
    expect(events[1]).toMatchObject({
      id: 'evt-1',
      tag: 'analysis_requested',
      status: 'pending',
    });
  });

  it('reads project snapshot with decision events and agent usage stats', () => {
    const projectRoot = join(tmpdir(), `ornn-dashboard-snapshot-${Date.now()}`);
    testRoots.push(projectRoot);
    mkdirSync(join(projectRoot, '.ornn', 'state'), { recursive: true });

    writeFileSync(
      join(projectRoot, '.ornn', 'state', 'decision-events.ndjson'),
      JSON.stringify({
        id: 'evt-1',
        timestamp: '2026-04-09T12:00:00.000Z',
        tag: 'analysis_requested',
        skillId: 'systematic-debugging',
        runtime: 'codex',
        status: 'pending',
        detail: 'probe says ready',
      }) + '\n',
      'utf-8'
    );

    writeFileSync(
      join(projectRoot, '.ornn', 'state', 'agent-usage-summary.json'),
      JSON.stringify({
        updatedAt: '2026-04-09T12:02:00.000Z',
        scope: 'ornn_agent',
        callCount: 3,
        promptTokens: 1800,
        completionTokens: 420,
        totalTokens: 2220,
        byModel: {
          'deepseek/deepseek-reasoner': {
            callCount: 2,
            promptTokens: 1200,
            completionTokens: 300,
            totalTokens: 1500,
          },
        },
        byScope: {
          decision_explainer: {
            callCount: 1,
            promptTokens: 400,
            completionTokens: 100,
            totalTokens: 500,
          },
          skill_call_analyzer: {
            callCount: 1,
            promptTokens: 800,
            completionTokens: 200,
            totalTokens: 1000,
          },
          readiness_probe: {
            callCount: 1,
            promptTokens: 600,
            completionTokens: 120,
            totalTokens: 720,
          },
        },
      }),
      'utf-8'
    );

    const snapshot = readProjectSnapshot(projectRoot);
    expect(snapshot.decisionEvents).toHaveLength(1);
    expect(snapshot.agentUsage).toMatchObject({
      callCount: 3,
      totalTokens: 2220,
    });
  });

  it('returns empty agent usage stats when summary is absent', () => {
    const projectRoot = join(tmpdir(), `ornn-dashboard-usage-empty-${Date.now()}`);
    testRoots.push(projectRoot);
    mkdirSync(join(projectRoot, '.ornn', 'state'), { recursive: true });

    expect(readAgentUsageStats(projectRoot)).toMatchObject({
      callCount: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      byModel: {},
      byScope: {},
    });
  });

  it('backfills daemon activity from task episodes and patch history', () => {
    const projectRoot = join(tmpdir(), `ornn-dashboard-daemon-backfill-${Date.now()}`);
    testRoots.push(projectRoot);
    mkdirSync(join(projectRoot, '.ornn', 'state'), { recursive: true });

    writeFileSync(
      join(projectRoot, '.ornn', 'state', 'daemon-checkpoint.json'),
      JSON.stringify({
        isRunning: true,
        startedAt: '2026-04-10T22:00:00.000Z',
        processedTraces: 329,
        lastCheckpointAt: '2026-04-10T22:39:24.975Z',
        retryQueueSize: 0,
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
      join(projectRoot, '.ornn', 'state', 'task-episodes.json'),
      JSON.stringify({
        updatedAt: '2026-04-10T22:39:08.402Z',
        episodes: [
          {
            episodeId: 'episode-1',
            projectPath: projectRoot,
            runtime: 'codex',
            sessionIds: ['session-1'],
            startedAt: '2026-04-10T22:37:52.696Z',
            lastActivityAt: '2026-04-10T22:38:33.803Z',
            state: 'analyzing',
            traceRefs: ['trace-1'],
            turnIds: ['line_1'],
            skillSegments: [
              {
                segmentId: 'segment-1',
                skillId: 'systematic-debugging',
                shadowId: 'codex::systematic-debugging@/tmp/project',
                runtime: 'codex',
                firstMappedTraceId: 'trace-1',
                lastRelatedTraceId: 'trace-1',
                mappedTraceIds: ['trace-1'],
                relatedTraceIds: ['trace-1'],
                startedAt: '2026-04-10T22:37:52.696Z',
                lastActivityAt: '2026-04-10T22:38:33.803Z',
                status: 'active',
              },
            ],
            stats: {
              totalTraceCount: 70,
              totalTurnCount: 70,
              mappedTraceCount: 1,
              tracesSinceLastProbe: 0,
              turnsSinceLastProbe: 0,
            },
            probeState: {
              probeCount: 3,
              lastProbeTraceIndex: 70,
              lastProbeTurnIndex: 70,
              nextProbeTraceDelta: 20,
              nextProbeTurnDelta: 3,
              waitForEventTypes: [],
              mode: 'count_driven',
              consecutiveNeedMoreCount: 0,
              consecutiveReadyCount: 1,
            },
            analysisStatus: 'running',
          },
        ],
      }),
      'utf-8'
    );

    writeFileSync(
      join(projectRoot, '.ornn', 'state', 'decision-events.ndjson'),
      [
        JSON.stringify({
          id: 'patch-1',
          timestamp: '2026-04-10T12:16:20.214Z',
          tag: 'patch_applied',
          skillId: 'vercel-react-best-practices',
          runtime: 'codex',
          status: 'success',
          detail: 'revision=1',
        }),
        JSON.stringify({
          id: 'analysis-1',
          timestamp: '2026-04-10T22:38:53.914Z',
          tag: 'analysis_requested',
          skillId: 'systematic-debugging',
          runtime: 'codex',
          status: 'episode_ready',
          detail: 'episode=episode-1',
        }),
      ].join('\n') + '\n',
      'utf-8'
    );

    const daemon = readDaemonStatus(projectRoot);
    expect(daemon.optimizationStatus).toMatchObject({
      currentState: 'analyzing',
      currentSkillId: 'systematic-debugging',
      queueSize: 1,
      lastOptimizationAt: '2026-04-10T12:16:20.214Z',
    });
  });

  it('backfills daemon failure state from recent decision events when checkpoint is empty', () => {
    const projectRoot = join(tmpdir(), `ornn-dashboard-daemon-failure-${Date.now()}`);
    testRoots.push(projectRoot);
    mkdirSync(join(projectRoot, '.ornn', 'state'), { recursive: true });

    writeFileSync(
      join(projectRoot, '.ornn', 'state', 'decision-events.ndjson'),
      [
        JSON.stringify({
          id: 'analysis-1',
          timestamp: '2026-04-10T22:38:53.914Z',
          tag: 'analysis_failed',
          skillId: 'systematic-debugging',
          runtime: 'codex',
          status: 'failed',
          detail: 'llm unavailable',
        }),
      ].join('\n') + '\n',
      'utf-8'
    );

    const daemon = readDaemonStatus(projectRoot);
    expect(daemon.optimizationStatus).toMatchObject({
      currentState: 'error',
      currentSkillId: 'systematic-debugging',
      lastError: 'llm unavailable',
    });
  });
});
