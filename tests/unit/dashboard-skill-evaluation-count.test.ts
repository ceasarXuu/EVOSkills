import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readProjectSnapshot } from '../../src/dashboard/data-reader.js';
import type { TaskEpisode } from '../../src/core/task-episode/index.js';

const testRoots: string[] = [];

afterEach(() => {
  for (const root of testRoots) {
    if (existsSync(root)) {
      rmSync(root, { recursive: true, force: true });
    }
  }
  testRoots.length = 0;
});

function makeEpisode(overrides: Partial<TaskEpisode> = {}): TaskEpisode {
  const runtime = overrides.runtime ?? 'codex';
  return {
    episodeId: 'episode-1',
    projectPath: '/project',
    runtime,
    sessionIds: ['session-1'],
    startedAt: '2026-04-18T00:00:00.000Z',
    lastActivityAt: '2026-04-18T00:00:10.000Z',
    state: 'collecting',
    traceRefs: ['trace-1'],
    turnIds: ['turn-1'],
    skillSegments: [
      {
        segmentId: 'segment-1',
        skillId: 'systematic-debugging',
        shadowId: 'codex::systematic-debugging',
        runtime: 'codex',
        firstMappedTraceId: 'trace-1',
        lastRelatedTraceId: 'trace-1',
        mappedTraceIds: ['trace-1'],
        relatedTraceIds: ['trace-1'],
        startedAt: '2026-04-18T00:00:00.000Z',
        lastActivityAt: '2026-04-18T00:00:10.000Z',
        status: 'open',
      },
    ],
    stats: {
      totalTraceCount: 1,
      totalTurnCount: 1,
      mappedTraceCount: 1,
      tracesSinceLastProbe: 1,
      turnsSinceLastProbe: 1,
    },
    probeState: {
      probeCount: 0,
      lastProbeTraceIndex: 0,
      lastProbeTurnIndex: 0,
      nextProbeTraceDelta: 10,
      nextProbeTurnDelta: 10,
      waitForEventTypes: [],
      mode: 'count_driven',
      consecutiveNeedMoreCount: 0,
      consecutiveReadyCount: 0,
    },
    analysisStatus: 'collecting',
    ...overrides,
  };
}

describe('dashboard skill evaluation count', () => {
  it('counts unique task episode scopes for each project skill and host', () => {
    const projectRoot = join(tmpdir(), `ornn-dashboard-evaluation-count-${Date.now()}`);
    testRoots.push(projectRoot);
    mkdirSync(join(projectRoot, '.ornn', 'shadows'), { recursive: true });
    mkdirSync(join(projectRoot, '.ornn', 'state'), { recursive: true });

    writeFileSync(
      join(projectRoot, '.ornn', 'shadows', 'index.json'),
      JSON.stringify([
        {
          skillId: 'systematic-debugging',
          runtime: 'codex',
          version: 'v1',
          content: '',
          status: 'pending',
          createdAt: '2026-04-18T00:00:00.000Z',
          updatedAt: '2026-04-18T00:00:00.000Z',
          traceCount: 46,
        },
        {
          skillId: 'systematic-debugging',
          runtime: 'claude',
          version: 'v1',
          content: '',
          status: 'pending',
          createdAt: '2026-04-18T00:00:00.000Z',
          updatedAt: '2026-04-18T00:00:00.000Z',
          traceCount: 7,
        },
      ]),
      'utf-8'
    );

    writeFileSync(
      join(projectRoot, '.ornn', 'state', 'task-episodes.json'),
      JSON.stringify({
        updatedAt: '2026-04-18T00:10:00.000Z',
        episodes: [
          makeEpisode({ episodeId: 'episode-codex-1' }),
          makeEpisode({ episodeId: 'episode-codex-2' }),
          makeEpisode({
            episodeId: 'episode-claude-1',
            runtime: 'claude',
            skillSegments: [
              {
                segmentId: 'segment-claude-1',
                skillId: 'systematic-debugging',
                shadowId: 'claude::systematic-debugging',
                runtime: 'claude',
                firstMappedTraceId: 'trace-claude-1',
                lastRelatedTraceId: 'trace-claude-1',
                mappedTraceIds: ['trace-claude-1'],
                relatedTraceIds: ['trace-claude-1'],
                startedAt: '2026-04-18T00:00:00.000Z',
                lastActivityAt: '2026-04-18T00:00:10.000Z',
                status: 'open',
              },
            ],
          }),
        ],
      }),
      'utf-8'
    );

    const snapshot = readProjectSnapshot(projectRoot);
    const codexSkill = snapshot.skills.find((skill) => skill.runtime === 'codex');
    const claudeSkill = snapshot.skills.find((skill) => skill.runtime === 'claude');

    expect(codexSkill?.evaluationCount).toBe(2);
    expect(claudeSkill?.evaluationCount).toBe(1);
  });
});
