import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  computeTraceStats,
  countProcessedTraceIds,
  readRecentActivityTraces,
  readRecentTraces,
  readTracesByIds,
} from '../../src/dashboard/readers/trace-reader.js';

describe('dashboard trace reader', () => {
  const testDir = join(tmpdir(), `ornn-dashboard-trace-reader-${Date.now()}`);

  beforeEach(() => {
    mkdirSync(join(testDir, '.ornn', 'state'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('reads recent traces across session files and computes stats', () => {
    const stateDir = join(testDir, '.ornn', 'state');
    writeFileSync(
      join(stateDir, 'session-a.ndjson'),
      [
        JSON.stringify({
          trace_id: 'trace-a1',
          runtime: 'codex',
          session_id: 'session-a',
          turn_id: 'turn-1',
          event_type: 'tool_call',
          timestamp: '2026-04-17T10:00:00.000Z',
          status: 'success',
          skill_refs: ['test-driven-development'],
        }),
        JSON.stringify({
          trace_id: 'trace-a2',
          runtime: 'claude',
          session_id: 'session-a',
          turn_id: 'turn-2',
          event_type: 'assistant_output',
          timestamp: '2026-04-17T10:02:00.000Z',
          status: 'failure',
          skill_refs: [],
        }),
      ].join('\n') + '\n',
      'utf-8'
    );
    writeFileSync(
      join(stateDir, 'session-b.ndjson'),
      JSON.stringify({
        trace_id: 'trace-b1',
        runtime: 'codex',
        session_id: 'session-b',
        turn_id: 'turn-1',
        event_type: 'assistant_output',
        timestamp: '2026-04-17T10:01:00.000Z',
        status: 'success',
        skill_refs: [],
      }) + '\n',
      'utf-8'
    );

    const traces = readRecentTraces(testDir, 10);
    expect(traces.map((trace) => trace.trace_id)).toEqual(['trace-a2', 'trace-b1', 'trace-a1']);
    expect(countProcessedTraceIds(testDir)).toBe(3);

    expect(computeTraceStats(traces)).toEqual({
      total: 3,
      byRuntime: { claude: 1, codex: 2 },
      byStatus: { failure: 1, success: 2 },
      byEventType: { assistant_output: 2, tool_call: 1 },
    });
  });

  it('keeps recent skill-context traces and resolves traces by id in timestamp order', () => {
    const tracePath = join(testDir, '.ornn', 'state', 'session-a.ndjson');
    const lines: string[] = [
      JSON.stringify({
        trace_id: 'skill-trace',
        runtime: 'codex',
        session_id: 'session-a',
        turn_id: 'turn-1',
        event_type: 'tool_call',
        timestamp: '2026-04-17T11:00:00.000Z',
        status: 'success',
        skill_refs: ['systematic-debugging'],
      }),
      JSON.stringify({
        trace_id: 'mid-trace',
        runtime: 'codex',
        session_id: 'session-a',
        turn_id: 'turn-2',
        event_type: 'tool_result',
        timestamp: '2026-04-17T11:00:01.000Z',
        status: 'success',
        skill_refs: [],
      }),
    ];

    for (let index = 0; index < 80; index += 1) {
      lines.push(JSON.stringify({
        trace_id: `trace-${index}`,
        runtime: 'codex',
        session_id: 'session-a',
        turn_id: `turn-${index + 3}`,
        event_type: 'tool_result',
        timestamp: `2026-04-17T11:${String(Math.floor((index + 2) / 60)).padStart(2, '0')}:${String((index + 2) % 60).padStart(2, '0')}.000Z`,
        status: 'success',
        skill_refs: [],
      }));
    }

    writeFileSync(tracePath, lines.join('\n') + '\n', 'utf-8');

    const activityTraces = readRecentActivityTraces(testDir, 30, 12, 4000);
    expect(activityTraces.some((trace) => trace.trace_id === 'skill-trace')).toBe(true);
    expect(activityTraces[0]?.trace_id).toBe('trace-79');

    expect(readTracesByIds(testDir, ['trace-3', 'skill-trace', 'mid-trace']).map((trace) => trace.trace_id)).toEqual([
      'skill-trace',
      'mid-trace',
      'trace-3',
    ]);
  });
});
