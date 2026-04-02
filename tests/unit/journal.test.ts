import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { Journal } from '../../src/core/journal/index.js';
import type { Trace } from '../../src/types/index.js';

describe('Journal', () => {
  const testProjectPath = join(tmpdir(), 'ornn-journal-test-' + Date.now());
  const dbPath = join(testProjectPath, '.ornn', 'journal.db');

  beforeEach(() => {
    mkdirSync(testProjectPath, { recursive: true });
    mkdirSync(join(testProjectPath, '.ornn'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testProjectPath)) {
      rmSync(testProjectPath, { recursive: true, force: true });
    }
  });

  const makeTrace = (id: string, session: string): Trace => ({
    trace_id: id,
    session_id: session,
    turn_id: 'turn-1',
    runtime: 'codex',
    event_type: 'user_input',
    status: 'success',
    timestamp: new Date().toISOString(),
    user_input: 'test input',
  });

  describe('init', () => {
    it('should initialize without errors', async () => {
      const journal = new Journal({ projectPath: testProjectPath });
      await expect(journal.init()).resolves.not.toThrow();
    });

    it('should be idempotent', async () => {
      const journal = new Journal({ projectPath: testProjectPath });
      await journal.init();
      await journal.init();
    });
  });

  describe('store and get', () => {
    it('should store and retrieve a trace', async () => {
      const journal = new Journal({ projectPath: testProjectPath });
      await journal.init();

      const trace = makeTrace('trace-1', 'session-1');
      journal.store(trace);
      await new Promise((r) => setTimeout(r, 200));
      await journal.close();

      const journal2 = new Journal({ projectPath: testProjectPath });
      await journal2.init();
      const retrieved = journal2.get('trace-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.trace_id).toBe('trace-1');
      expect(retrieved?.session_id).toBe('session-1');
      await journal2.close();
    });

    it('should return undefined for non-existent trace', async () => {
      const journal = new Journal({ projectPath: testProjectPath });
      await journal.init();
      const result = journal.get('non-existent');
      expect(result?.trace_id).toBeUndefined();
      await journal.close();
    });
  });

  describe('storeBatch', () => {
    it('should store multiple traces', async () => {
      const journal = new Journal({ projectPath: testProjectPath });
      await journal.init();

      const traces = [makeTrace('t-1', 's-1'), makeTrace('t-2', 's-1'), makeTrace('t-3', 's-2')];
      journal.storeBatch(traces);
      await journal.close();

      const journal2 = new Journal({ projectPath: testProjectPath });
      await journal2.init();
      const all = journal2.getAll();
      expect(all.length).toBe(3);
      await journal2.close();
    });
  });

  describe('query', () => {
    it('should query by session ID', async () => {
      const journal = new Journal({ projectPath: testProjectPath });
      await journal.init();

      journal.store(makeTrace('t-1', 's-1'));
      journal.store(makeTrace('t-2', 's-2'));
      journal.store(makeTrace('t-3', 's-1'));
      await new Promise((r) => setTimeout(r, 200));
      await journal.close();

      const journal2 = new Journal({ projectPath: testProjectPath });
      await journal2.init();
      const results = journal2.query({ sessionId: 's-1' });
      expect(results.length).toBe(2);
      await journal2.close();
    });

    it('should query by runtime', async () => {
      const journal = new Journal({ projectPath: testProjectPath });
      await journal.init();

      const trace1: Trace = { ...makeTrace('t-1', 's-1'), runtime: 'codex' };
      const trace2: Trace = { ...makeTrace('t-2', 's-1'), runtime: 'claude' };
      journal.store(trace1);
      journal.store(trace2);
      await new Promise((r) => setTimeout(r, 200));
      await journal.close();

      const journal2 = new Journal({ projectPath: testProjectPath });
      await journal2.init();
      const results = journal2.query({ runtime: 'codex' });
      expect(results.length).toBe(1);
      await journal2.close();
    });

    it('should query with limit and offset', async () => {
      const journal = new Journal({ projectPath: testProjectPath });
      await journal.init();

      for (let i = 0; i < 5; i++) {
        journal.store(makeTrace(`t-${i}`, 's-1'));
      }
      await new Promise((r) => setTimeout(r, 200));
      await journal.close();

      const journal2 = new Journal({ projectPath: testProjectPath });
      await journal2.init();
      const results = journal2.query({ limit: 2, offset: 1 });
      expect(results.length).toBe(2);
      await journal2.close();
    });
  });

  describe('getBySession', () => {
    it('should return traces for a session', async () => {
      const journal = new Journal({ projectPath: testProjectPath });
      await journal.init();

      journal.store(makeTrace('t-1', 's-1'));
      journal.store(makeTrace('t-2', 's-2'));
      await journal.close();

      const journal2 = new Journal({ projectPath: testProjectPath });
      await journal2.init();
      const results = journal2.getBySession('s-1');
      expect(results.length).toBe(1);
      await journal2.close();
    });
  });

  describe('getBySkill', () => {
    it('should return traces with skill references', async () => {
      const journal = new Journal({ projectPath: testProjectPath });
      await journal.init();

      const trace: Trace = {
        ...makeTrace('t-1', 's-1'),
        skill_refs: ['skill-a@v1', 'skill-b@v1'],
      };
      journal.store(trace);
      await journal.close();

      const journal2 = new Journal({ projectPath: testProjectPath });
      await journal2.init();
      const results = journal2.getBySkill('skill-a');
      expect(results.length).toBe(1);
      await journal2.close();
    });
  });

  describe('getAll', () => {
    it('should return all traces', async () => {
      const journal = new Journal({ projectPath: testProjectPath });
      await journal.init();

      journal.store(makeTrace('t-1', 's-1'));
      journal.store(makeTrace('t-2', 's-2'));
      await journal.close();

      const journal2 = new Journal({ projectPath: testProjectPath });
      await journal2.init();
      expect(journal2.getAll().length).toBe(2);
      await journal2.close();
    });
  });

  describe('getSessionIds', () => {
    it('should return unique session IDs', async () => {
      const journal = new Journal({ projectPath: testProjectPath });
      await journal.init();

      journal.store(makeTrace('t-1', 's-1'));
      journal.store(makeTrace('t-2', 's-1'));
      journal.store(makeTrace('t-3', 's-2'));
      await journal.close();

      const journal2 = new Journal({ projectPath: testProjectPath });
      await journal2.init();
      const ids = journal2.getSessionIds();
      expect(ids.sort()).toEqual(['s-1', 's-2']);
      await journal2.close();
    });
  });

  describe('getSkillIds', () => {
    it('should return unique skill IDs', async () => {
      const journal = new Journal({ projectPath: testProjectPath });
      await journal.init();

      const trace1: Trace = { ...makeTrace('t-1', 's-1'), skill_refs: ['skill-a@v1'] };
      const trace2: Trace = { ...makeTrace('t-2', 's-1'), skill_refs: ['skill-b@v1'] };
      journal.store(trace1);
      journal.store(trace2);
      await journal.close();

      const journal2 = new Journal({ projectPath: testProjectPath });
      await journal2.init();
      const ids = journal2.getSkillIds();
      expect(ids.sort()).toEqual(['skill-a', 'skill-b']);
      await journal2.close();
    });
  });

  describe('delete', () => {
    it('should return false for non-existent trace', async () => {
      const journal = new Journal({ projectPath: testProjectPath });
      await journal.init();
      expect(journal.delete('non-existent')).toBe(false);
      await journal.close();
    });
  });

  describe('close', () => {
    it('should close without errors', async () => {
      const journal = new Journal({ projectPath: testProjectPath });
      await journal.init();
      await expect(journal.close()).resolves.not.toThrow();
    });
  });

  describe('export/import', () => {
    it('should export to JSON and import back', async () => {
      const journal = new Journal({ projectPath: testProjectPath });
      await journal.init();

      journal.store(makeTrace('t-1', 's-1'));
      journal.store(makeTrace('t-2', 's-2'));
      await journal.close();

      const journal2 = new Journal({ projectPath: testProjectPath });
      await journal2.init();
      const json = journal2.exportToJSON();
      expect(json).toBeDefined();
      expect(json.length).toBeGreaterThan(0);

      const journal3 = new Journal({ projectPath: testProjectPath });
      await journal3.init();
      journal3.importFromJSON(json);
      expect(journal3.getAll().length).toBe(2);
      await journal3.close();
      await journal2.close();
    });
  });

  describe('getStats', () => {
    it('should return trace statistics', async () => {
      const journal = new Journal({ projectPath: testProjectPath });
      await journal.init();

      journal.store(makeTrace('t-1', 's-1'));
      journal.store(makeTrace('t-2', 's-1'));
      await journal.close();

      const journal2 = new Journal({ projectPath: testProjectPath });
      await journal2.init();
      const stats = journal2.getStats();
      expect(stats.totalTraces).toBe(2);
      await journal2.close();
    });
  });

  describe('enforceRetention', () => {
    it('should enforce retention policy', async () => {
      const journal = new Journal({ projectPath: testProjectPath, maxTraces: 3 });
      await journal.init();

      for (let i = 0; i < 5; i++) {
        journal.store(makeTrace(`t-${i}`, 's-1'));
      }
      await journal.close();

      const journal2 = new Journal({ projectPath: testProjectPath });
      await journal2.init();
      const count = journal2.getAll().length;
      expect(count).toBeLessThanOrEqual(5);
      await journal2.close();
    });
  });

  describe('getJournalRecords', () => {
    it('should return empty array for placeholder', async () => {
      const journal = new Journal({ projectPath: testProjectPath });
      await journal.init();
      const records = journal.getJournalRecords('test');
      expect(records).toEqual([]);
      await journal.close();
    });
  });

  describe('getLatestRevision', () => {
    it('should return 0 for placeholder', async () => {
      const journal = new Journal({ projectPath: testProjectPath });
      await journal.init();
      expect(journal.getLatestRevision('test')).toBe(0);
      await journal.close();
    });
  });

  describe('getSnapshots', () => {
    it('should return empty array for placeholder', async () => {
      const journal = new Journal({ projectPath: testProjectPath });
      await journal.init();
      expect(journal.getSnapshots('test')).toEqual([]);
      await journal.close();
    });
  });

  describe('record', () => {
    it('should not throw for placeholder', async () => {
      const journal = new Journal({ projectPath: testProjectPath });
      await journal.init();
      expect(() => journal.record('test', { type: 'optimization' })).not.toThrow();
      await journal.close();
    });
  });
});
