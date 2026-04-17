import { describe, it, expect, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { Database } from 'sql.js';
import {
  JournalSQLiteStore,
  type JournalSchemaInitializer,
} from '../../src/core/journal/journal-sqlite-store.js';
import { TraceJournal, createTraceJournalTables } from '../../src/core/journal/trace-journal.js';
import {
  ShadowHistoryJournal,
  createShadowHistoryTables,
} from '../../src/core/journal/shadow-history.js';
import type { Trace } from '../../src/types/index.js';

describe('journal components', () => {
  const cleanupPaths = new Set<string>();

  afterEach(() => {
    for (const path of cleanupPaths) {
      if (existsSync(path)) {
        rmSync(path, { recursive: true, force: true });
      }
    }
    cleanupPaths.clear();
  });

  const makeProjectPath = (name: string) => {
    const projectPath = join(
      tmpdir(),
      `ornn-journal-components-${Date.now()}-${Math.random()}-${name}`
    );
    cleanupPaths.add(projectPath);
    return projectPath;
  };

  const makeTrace = (id: string, sessionId: string): Trace => ({
    trace_id: id,
    session_id: sessionId,
    turn_id: 'turn-1',
    runtime: 'codex',
    event_type: 'assistant_output',
    status: 'success',
    timestamp: new Date().toISOString(),
    assistant_output: `trace-${id}`,
    skill_refs: ['skill-a@v1'],
  });

  it('shared sqlite store initializes schema callbacks and reopens persisted data', async () => {
    const projectPath = makeProjectPath('store');
    const initializeSchema: JournalSchemaInitializer = (db: Database) => {
      db.run('CREATE TABLE IF NOT EXISTS test_items (id TEXT PRIMARY KEY, value TEXT NOT NULL)');
    };

    const first = new JournalSQLiteStore({ projectPath }, initializeSchema);
    await first.init();
    first.database.run('INSERT INTO test_items (id, value) VALUES (?, ?)', ['item-1', 'value-1']);
    await first.close();

    const second = new JournalSQLiteStore({ projectPath }, initializeSchema);
    await second.init();
    const stmt = second.database.prepare('SELECT value FROM test_items WHERE id = ?');
    stmt.bind(['item-1']);
    expect(stmt.step()).toBe(true);
    expect(stmt.getAsObject().value).toBe('value-1');
    stmt.free();
    await second.close();
  });

  it('trace journal persists traces and supports skill queries and stats', async () => {
    const projectPath = makeProjectPath('trace');

    const first = new JournalSQLiteStore({ projectPath }, createTraceJournalTables);
    await first.init();
    const traceJournal = new TraceJournal(first);
    traceJournal.store(makeTrace('trace-1', 'session-1'));
    await first.close();

    const second = new JournalSQLiteStore({ projectPath }, createTraceJournalTables);
    await second.init();
    const traceJournal2 = new TraceJournal(second);
    expect(traceJournal2.getBySkill('skill-a')).toHaveLength(1);
    expect(traceJournal2.getStats().totalTraces).toBe(1);
    expect(traceJournal2.getStats().byRuntime.codex).toBe(1);
    await second.close();
  });

  it('shadow history records revisions, snapshots, and rollback targets', async () => {
    const projectPath = makeProjectPath('history');
    const shadowId = `codex::test-skill@${projectPath}`;
    const shadowPath = join(projectPath, '.ornn', 'shadows', 'codex', 'test-skill.md');

    mkdirSync(join(projectPath, '.ornn', 'shadows', 'codex'), { recursive: true });
    writeFileSync(shadowPath, '# Revision 0\n', 'utf-8');

    const store = new JournalSQLiteStore({ projectPath }, createShadowHistoryTables);
    await store.init();
    const shadowHistory = new ShadowHistoryJournal(store);

    shadowHistory.record(shadowId, {
      timestamp: '2026-04-18T12:00:00.000Z',
      reason: 'Add fallback branch',
      source_sessions: ['session-1'],
      change_type: 'add_fallback',
      applied_by: 'auto',
    });
    const snapshotPath = shadowHistory.createSnapshot(shadowId, 1);

    expect(shadowHistory.getLatestRevision(shadowId)).toBe(1);
    expect(shadowHistory.getJournalRecords(shadowId)).toHaveLength(1);
    expect(shadowHistory.getRecordByRevision(shadowId, 1)?.reason).toBe('Add fallback branch');
    expect(existsSync(snapshotPath)).toBe(true);

    writeFileSync(shadowPath, '# Broken Revision\n', 'utf-8');
    expect(shadowHistory.rollbackToSnapshot(shadowId, snapshotPath)).toBe(true);
    expect(readFileSync(shadowPath, 'utf-8')).toBe('# Revision 0\n');

    await store.close();
  });
});
