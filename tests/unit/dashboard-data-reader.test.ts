import { beforeEach, describe, expect, it, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readProjectSnapshotVersion, readRecentTraces } from '../../src/dashboard/data-reader.js';

describe('dashboard data reader snapshot version', () => {
  const testDir = join(tmpdir(), 'ornn-dashboard-data-reader-' + Date.now());

  beforeEach(() => {
    mkdirSync(join(testDir, '.ornn', 'state'), { recursive: true });
    mkdirSync(join(testDir, '.ornn', 'shadows'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('changes when agent usage ndjson changes', async () => {
    const usagePath = join(testDir, '.ornn', 'state', 'agent-usage.ndjson');
    writeFileSync(usagePath, '', 'utf-8');

    const before = readProjectSnapshotVersion(testDir);

    await new Promise((resolve) => setTimeout(resolve, 5));
    writeFileSync(
      usagePath,
      JSON.stringify({
        timestamp: '2026-04-12T01:00:00.000Z',
        model: 'deepseek/deepseek-chat',
        scope: 'scope-1',
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
        durationMs: 200,
      }) + '\n',
      'utf-8'
    );

    const after = readProjectSnapshotVersion(testDir);
    expect(after).not.toBe(before);
  });

  it('reads recent traces from session-scoped ndjson files', () => {
    const stateDir = join(testDir, '.ornn', 'state');
    writeFileSync(
      join(stateDir, 'session-a.ndjson'),
      JSON.stringify({
        trace_id: 'trace-a',
        runtime: 'codex',
        session_id: 'session-a',
        turn_id: 'turn-1',
        event_type: 'tool_call',
        timestamp: '2026-04-12T02:00:00.000Z',
        status: 'success',
        skill_refs: ['test-driven-development'],
      }) + '\n',
      'utf-8'
    );
    writeFileSync(
      join(stateDir, 'session-b.ndjson'),
      JSON.stringify({
        trace_id: 'trace-b',
        runtime: 'codex',
        session_id: 'session-b',
        turn_id: 'turn-2',
        event_type: 'assistant_output',
        timestamp: '2026-04-12T02:01:00.000Z',
        status: 'success',
        skill_refs: ['systematic-debugging'],
      }) + '\n',
      'utf-8'
    );

    const traces = readRecentTraces(testDir, 10);
    expect(traces.map((trace) => trace.trace_id)).toEqual(['trace-b', 'trace-a']);
    expect(traces.map((trace) => trace.session_id)).toEqual(['session-b', 'session-a']);
  });

  it('changes snapshot version when a session-scoped trace file changes', async () => {
    const tracePath = join(testDir, '.ornn', 'state', 'session-a.ndjson');
    writeFileSync(tracePath, '', 'utf-8');

    const before = readProjectSnapshotVersion(testDir);

    await new Promise((resolve) => setTimeout(resolve, 5));
    writeFileSync(
      tracePath,
      JSON.stringify({
        trace_id: 'trace-a',
        runtime: 'codex',
        session_id: 'session-a',
        turn_id: 'turn-1',
        event_type: 'tool_call',
        timestamp: '2026-04-12T02:02:00.000Z',
        status: 'success',
      }) + '\n',
      'utf-8'
    );

    const after = readProjectSnapshotVersion(testDir);
    expect(after).not.toBe(before);
  });
});
