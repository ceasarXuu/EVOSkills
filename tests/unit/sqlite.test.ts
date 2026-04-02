import { describe, it, expect, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync, existsSync } from 'node:fs';
import { SQLiteStorage } from '../../src/storage/sqlite.js';
import type { ProjectSkillShadow, OriginSkill } from '../../src/types/index.js';

describe('SQLiteStorage', () => {
  const testDbPath = join(tmpdir(), 'ornn-sqlite-test-' + Date.now() + '.db');

  afterEach(() => {
    SQLiteStorage.removeInstance(testDbPath);
    if (existsSync(testDbPath)) {
      rmSync(testDbPath, { force: true });
    }
  });

  it('should create and get instance', async () => {
    const storage = await SQLiteStorage.getInstance(testDbPath);
    expect(storage).toBeDefined();
    storage.close();
  });

  it('should return same instance for same path', async () => {
    const s1 = await SQLiteStorage.getInstance(testDbPath);
    const s2 = await SQLiteStorage.getInstance(testDbPath);
    expect(s1).toBe(s2);
    s1.close();
  });

  it('should upsert and query shadow skills', async () => {
    const storage = await SQLiteStorage.getInstance(testDbPath);
    await storage.init();

    const shadow: ProjectSkillShadow = {
      shadow_id: 'test-skill@test-project',
      project_id: 'test-project',
      skill_id: 'test-skill',
      origin_skill_id: 'origin-skill',
      origin_version_at_fork: '2024-01-01',
      shadow_path: '/path/to/shadow',
      current_revision: 1,
      status: 'active',
      created_at: new Date().toISOString(),
      last_optimized_at: new Date().toISOString(),
    };

    storage.upsertShadowSkill(shadow);

    const skill = storage.getShadowSkill('test-project', 'test-skill');
    expect(skill).not.toBeNull();
    expect(skill?.skill_id).toBe('test-skill');

    storage.close();
  });

  it('should update shadow status', async () => {
    const storage = await SQLiteStorage.getInstance(testDbPath);
    await storage.init();

    const shadow: ProjectSkillShadow = {
      shadow_id: 'test-skill@test-project',
      project_id: 'test-project',
      skill_id: 'test-skill',
      origin_skill_id: 'origin-skill',
      origin_version_at_fork: '2024-01-01',
      shadow_path: '/path/to/shadow',
      current_revision: 1,
      status: 'active',
      created_at: new Date().toISOString(),
      last_optimized_at: new Date().toISOString(),
    };

    storage.upsertShadowSkill(shadow);
    storage.updateShadowStatus('test-skill@test-project', 'frozen');

    const skill = storage.getShadowSkill('test-project', 'test-skill');
    expect(skill?.status).toBe('frozen');

    storage.close();
  });

  it('should upsert origin skills', async () => {
    const storage = await SQLiteStorage.getInstance(testDbPath);
    await storage.init();

    const origin: OriginSkill = {
      skill_id: 'origin-skill',
      origin_path: '/path/to/origin',
      origin_version: 'abc123',
      source: 'local',
      installed_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    };

    storage.upsertOriginSkill(origin);

    const skill = storage.getOriginSkill('origin-skill');
    expect(skill).not.toBeNull();
    expect(skill?.skill_id).toBe('origin-skill');

    storage.close();
  });

  it('should close without errors', async () => {
    const storage = await SQLiteStorage.getInstance(testDbPath);
    await storage.init();
    expect(() => storage.close()).not.toThrow();
  });
});
