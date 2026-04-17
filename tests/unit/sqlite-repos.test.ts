import { describe, it, expect, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync, rmSync } from 'node:fs';
import { SQLiteDbAdapter } from '../../src/storage/sqlite/sqlite-db-adapter.js';
import { createSQLiteStorageTables } from '../../src/storage/sqlite/sqlite-schema.js';
import { SQLiteShadowSkillRepo } from '../../src/storage/sqlite/sqlite-shadow-skill-repo.js';
import { SQLiteSessionRepo } from '../../src/storage/sqlite/sqlite-session-repo.js';
import { SQLiteOriginSkillRepo } from '../../src/storage/sqlite/sqlite-origin-skill-repo.js';
import { SQLiteTraceSkillMappingRepo } from '../../src/storage/sqlite/sqlite-trace-skill-mapping-repo.js';
import type { OriginSkill, ProjectSkillShadow, Session } from '../../src/types/index.js';

describe('sqlite repositories', () => {
  const cleanupPaths = new Set<string>();

  afterEach(() => {
    for (const path of cleanupPaths) {
      if (existsSync(path)) {
        rmSync(path, { recursive: true, force: true });
      }
    }
    cleanupPaths.clear();
  });

  const makeDbPath = (name: string) => {
    const dir = join(tmpdir(), `ornn-sqlite-repos-${Date.now()}-${Math.random()}-${name}`);
    cleanupPaths.add(dir);
    return join(dir, `${name}.db`);
  };

  const makeShadow = (id: string, projectId: string, skillId: string): ProjectSkillShadow => ({
    shadow_id: id,
    project_id: projectId,
    skill_id: skillId,
    origin_skill_id: `origin-${skillId}`,
    origin_version_at_fork: '1.0',
    shadow_path: `/path/to/${skillId}`,
    current_revision: 0,
    status: 'active',
    created_at: new Date().toISOString(),
    last_optimized_at: new Date().toISOString(),
  });

  const makeSession = (id: string, runtime = 'codex'): Session => ({
    session_id: id,
    runtime: runtime as Session['runtime'],
    project_id: 'proj-1',
    started_at: new Date().toISOString(),
    ended_at: null,
    trace_count: 0,
  });

  const makeOrigin = (skillId: string): OriginSkill => ({
    skill_id: skillId,
    origin_path: `/origins/${skillId}`,
    origin_version: '1.0.0',
    source: 'local',
    installed_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  });

  it('shadow repo persists shadow skills, evolution records, and snapshots', async () => {
    const adapter = new SQLiteDbAdapter(makeDbPath('shadow'), createSQLiteStorageTables);
    await adapter.init();
    const repo = new SQLiteShadowSkillRepo(adapter);

    repo.upsertShadowSkill(makeShadow('shadow-1', 'proj-1', 'skill-1'));
    repo.updateShadowRevision('shadow-1', 3);
    repo.addEvolutionRecordIndex({
      shadow_id: 'shadow-1',
      revision: 3,
      timestamp: new Date().toISOString(),
      change_type: 'optimize',
      source_sessions: ['sess-1'],
      confidence: 0.9,
    });
    repo.addSnapshot({
      shadow_id: 'shadow-1',
      revision: 3,
      timestamp: new Date().toISOString(),
      file_path: '/snapshots/skill-1.md',
      content_hash: 'hash-1',
    });

    expect(repo.getShadowSkill('proj-1', 'skill-1')?.current_revision).toBe(3);
    expect(repo.listShadowSkills('proj-1')).toHaveLength(1);
    expect(repo.getEvolutionRecordIndex('shadow-1')).toHaveLength(1);
    expect(repo.getLatestSnapshot('shadow-1')?.content_hash).toBe('hash-1');
    adapter.close();
  });

  it('session repo persists sessions and trace index rows', async () => {
    const adapter = new SQLiteDbAdapter(makeDbPath('session'), createSQLiteStorageTables);
    await adapter.init();
    const repo = new SQLiteSessionRepo(adapter);

    repo.createSession(makeSession('sess-1'));
    repo.incrementSessionTraceCount('sess-1');
    repo.addTraceIndex({
      trace_id: 'trace-1',
      session_id: 'sess-1',
      runtime: 'codex',
      event_type: 'assistant_output',
      timestamp: new Date().toISOString(),
      status: 'success',
    });

    expect(repo.getSession('sess-1')?.trace_count).toBe(1);
    expect(repo.getTraceIndexBySession('sess-1')).toHaveLength(1);
    adapter.close();
  });

  it('origin repo persists and lists origin skills', async () => {
    const adapter = new SQLiteDbAdapter(makeDbPath('origin'), createSQLiteStorageTables);
    await adapter.init();
    const repo = new SQLiteOriginSkillRepo(adapter);

    repo.upsertOriginSkill(makeOrigin('origin-1'));
    repo.upsertOriginSkill(makeOrigin('origin-2'));

    expect(repo.getOriginSkill('origin-1')?.skill_id).toBe('origin-1');
    expect(repo.listOriginSkills()).toHaveLength(2);
    adapter.close();
  });

  it('trace skill mapping repo persists mappings, stats, and cleanup', async () => {
    const adapter = new SQLiteDbAdapter(makeDbPath('mapping'), createSQLiteStorageTables);
    await adapter.init();
    const repo = new SQLiteTraceSkillMappingRepo(adapter);

    repo.upsertTraceSkillMapping({
      trace_id: 'trace-1',
      skill_id: 'skill-1',
      shadow_id: 'shadow-1',
      confidence: 0.9,
      reason: 'explicit mention',
      mapped_at: '2020-01-01T00:00:00.000Z',
    });
    repo.upsertTraceSkillMapping({
      trace_id: 'trace-2',
      skill_id: 'skill-1',
      shadow_id: 'shadow-1',
      confidence: 0.7,
      reason: 'inferred',
      mapped_at: new Date().toISOString(),
    });

    expect(repo.getTraceSkillMappings('skill-1')).toHaveLength(2);
    expect(repo.getTraceSkillMappingByTraceId('trace-1')).toHaveLength(1);
    expect(repo.getTraceSkillMappingStats().avg_confidence).toBeCloseTo(0.8);
    expect(repo.cleanupTraceSkillMappings(30)).toBe(1);
    adapter.close();
  });
});
