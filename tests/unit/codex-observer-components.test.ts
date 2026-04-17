import { describe, it, expect, afterEach } from 'vitest';
import { appendFileSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  readSessionLinesSinceOffset,
  readSessionTailLines,
} from '../../src/core/observer/codex/session-file-reader.js';
import {
  bootstrapRecentSessionFiles,
  primeSessionOffsets,
  reconcileRecentSessionGrowth,
  type ReconciliationWarnState,
} from '../../src/core/observer/codex/session-reconciler.js';
import {
  CodexEventPreprocessor,
  type CodexRawEvent,
} from '../../src/core/observer/codex/event-preprocessor.js';
import { emitCodexPreprocessedTraces } from '../../src/core/observer/codex/trace-emitter.js';
import type { PreprocessedTrace, Trace } from '../../src/types/index.js';

describe('codex observer components', () => {
  const cleanupPaths = new Set<string>();

  afterEach(() => {
    for (const path of cleanupPaths) {
      if (existsSync(path)) {
        rmSync(path, { recursive: true, force: true });
      }
    }
    cleanupPaths.clear();
  });

  const makeTestDir = (name: string) => {
    const dir = join(tmpdir(), `ornn-codex-observer-components-${Date.now()}-${Math.random()}-${name}`);
    cleanupPaths.add(dir);
    return dir;
  };

  it('session file reader buffers partial appended lines until completion', () => {
    const testDir = makeTestDir('reader');
    const sessionPath = join(testDir, 'session.jsonl');
    const processedByteOffset = new Map<string, number>();
    const pendingLineFragment = new Map<string, string>();
    mkdirSync(testDir, { recursive: true });

    writeFileSync(
      sessionPath,
      '{"timestamp":"2026-04-18T00:00:00.000Z","type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"first"}]}}\n',
      'utf-8'
    );

    const initialRead = readSessionLinesSinceOffset({
      path: sessionPath,
      processedByteOffset,
      pendingLineFragment,
    });
    processedByteOffset.set(sessionPath, initialRead.nextOffset);

    appendFileSync(
      sessionPath,
      '{"timestamp":"2026-04-18T00:01:00.000Z","type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"sec',
      'utf-8'
    );
    const partialRead = readSessionLinesSinceOffset({
      path: sessionPath,
      processedByteOffset,
      pendingLineFragment,
    });
    processedByteOffset.set(sessionPath, partialRead.nextOffset);

    appendFileSync(sessionPath, 'ond"}]}}\n', 'utf-8');
    const completedRead = readSessionLinesSinceOffset({
      path: sessionPath,
      processedByteOffset,
      pendingLineFragment,
    });

    expect(initialRead.lines).toHaveLength(1);
    expect(partialRead.lines).toEqual([]);
    expect(completedRead.lines).toHaveLength(1);
    expect(completedRead.nextOffset).toBe(statSync(sessionPath).size);
  });

  it('session reconciler primes offsets, bootstraps recent files, and recovers missed growth', () => {
    const testDir = makeTestDir('reconciler');
    const sessionsDir = join(testDir, 'sessions');
    mkdirSync(join(sessionsDir, '2026', '04', '18'), { recursive: true });
    const recentPath = join(sessionsDir, '2026', '04', '18', 'recent.jsonl');
    const olderPath = join(sessionsDir, '2026', '04', '18', 'older.jsonl');
    writeFileSync(recentPath, 'recent\n', 'utf-8');
    writeFileSync(olderPath, 'older\n', 'utf-8');

    const processedFiles = new Set<string>();
    const processedByteOffset = new Map<string, number>();
    const warnState = new Map<string, ReconciliationWarnState>();
    const bootstrapped: Array<{ path: string; options?: { bootstrapTailLines?: number } }> = [];
    const recovered: string[] = [];

    primeSessionOffsets({
      sessionFiles: [recentPath, olderPath],
      processedByteOffset,
      getFileSize: (path) => statSync(path).size,
    });

    bootstrapRecentSessionFiles({
      limit: 1,
      processedFiles,
      bootstrapTailLineLimit: 10,
      listRecentSessionFiles: () => [recentPath],
      processSessionFileInternal: (path, options) => {
        bootstrapped.push({ path, options });
      },
    });

    appendFileSync(recentPath, 'growth\n', 'utf-8');

    reconcileRecentSessionGrowth({
      limit: 1,
      processedFiles,
      processedByteOffset,
      reconciliationWarnState: warnState,
      reconciliationWarnDeltaBytes: 65536,
      reconciliationWarnCooldownMs: 60000,
      listRecentSessionFiles: () => [recentPath],
      getFileSize: (path) => statSync(path).size,
      extractSessionId: () => 'session-1',
      processSessionFileInternal: (path) => {
        recovered.push(path);
      },
      logDebug: () => {},
      logInfo: () => {},
      logWarn: () => {},
    });

    expect(processedByteOffset.get(recentPath)).toBeGreaterThan(0);
    expect(processedByteOffset.get(olderPath)).toBeGreaterThan(0);
    expect(bootstrapped).toEqual([{ path: recentPath, options: { bootstrapTailLines: 10 } }]);
    expect(recovered).toEqual([recentPath]);
  });

  it('event preprocessor extracts skill refs and preserves projectPath metadata', () => {
    const sessionProjectPaths = new Map<string, string>();
    const preprocessor = new CodexEventPreprocessor({
      sessionProjectPaths,
      getNextTurnId: () => 'turn-1',
    });

    const toolCall = preprocessor.preprocessResponseItem('session-1', 'turn-1', {
      timestamp: '2026-04-18T00:00:00.000Z',
      type: 'response_item',
      payload: {
        type: 'function_call',
        name: 'functions.exec_command',
        arguments: JSON.stringify({
          cmd: 'cat /Users/xuzhang/.agents/skills/show-my-repo/SKILL.md',
        }),
      },
    });

    sessionProjectPaths.set('session-1', '/projects/alpha');
    const standardTrace = preprocessor.convertToStandardTrace({
      sessionId: 'session-1',
      turnId: 'turn-2',
      timestamp: '2026-04-18T00:01:00.000Z',
      eventType: 'assistant_output',
      content: 'hello',
      metadata: { source: 'cli' },
    });

    expect(toolCall).toMatchObject({
      eventType: 'tool_call',
      skillRefs: ['show-my-repo'],
    });
    expect(standardTrace.metadata).toMatchObject({
      projectPath: '/projects/alpha',
      source: 'cli',
    });
  });

  it('trace emitter converts preprocessed traces and returns a summary', () => {
    const traces: PreprocessedTrace[] = [
      {
        sessionId: 'session-1',
        turnId: 'turn-1',
        timestamp: '2026-04-18T00:00:00.000Z',
        eventType: 'assistant_output',
        content: 'hello',
        skillRefs: ['skill-a'],
      },
      {
        sessionId: 'session-1',
        turnId: 'turn-2',
        timestamp: '2026-04-18T00:01:00.000Z',
        eventType: 'tool_call',
        content: { tool: 'functions.exec_command', args: { cmd: 'pwd' } },
      },
    ];
    const emitted: Trace[] = [];

    const summary = emitCodexPreprocessedTraces({
      sessionId: 'session-1',
      traces,
      convertToStandardTrace: (trace) =>
        ({
          trace_id: `${trace.sessionId}_${trace.turnId}`,
          runtime: 'codex',
          session_id: trace.sessionId,
          turn_id: trace.turnId,
          event_type: trace.eventType,
          timestamp: trace.timestamp,
          status: 'success',
          skill_refs: trace.skillRefs,
          ...(trace.eventType === 'assistant_output'
            ? { assistant_output: trace.content as string }
            : {}),
          ...(trace.eventType === 'tool_call'
            ? {
                tool_name: (trace.content as { tool: string }).tool,
                tool_args: (trace.content as { args: Record<string, unknown> }).args,
              }
            : {}),
        }) as Trace,
      emitTrace: (trace) => {
        emitted.push(trace);
      },
    });

    expect(emitted).toHaveLength(2);
    expect(summary).toEqual({
      totalTraces: 2,
      typeBreakdown: {
        assistant_output: 1,
        tool_call: 1,
      },
      detectedSkills: ['skill-a'],
    });
  });
});
