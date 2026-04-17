import type { ProjectSkillShadow, RuntimeType, ShadowStatus } from '../../types/index.js';
import { SQLiteDbAdapter } from './sqlite-db-adapter.js';

type EvolutionRecordIndex = {
  shadow_id: string;
  revision: number;
  timestamp: string;
  change_type: string;
  source_sessions: string[];
  confidence: number;
};

type SnapshotRecord = {
  shadow_id: string;
  revision: number;
  timestamp: string;
  file_path: string;
  content_hash: string;
};

function mapShadowSkillRow(row: Record<string, unknown>): ProjectSkillShadow {
  return {
    project_id: row.project_id as string,
    skill_id: row.skill_id as string,
    runtime: (row.runtime as RuntimeType | null) ?? undefined,
    shadow_id: row.shadow_id as string,
    origin_skill_id: row.origin_skill_id as string,
    origin_version_at_fork: row.origin_version_at_fork as string,
    shadow_path: row.shadow_path as string,
    current_revision: row.current_revision as number,
    status: row.status as ShadowStatus,
    created_at: row.created_at as string,
    last_optimized_at: row.last_optimized_at as string,
  };
}

export class SQLiteShadowSkillRepo {
  constructor(private readonly adapter: SQLiteDbAdapter) {}

  upsertShadowSkill(shadow: ProjectSkillShadow): void {
    this.adapter.database.run(
      `INSERT OR REPLACE INTO shadow_skills (
        shadow_id, project_id, skill_id, runtime, origin_skill_id, origin_version_at_fork,
        shadow_path, current_revision, status, created_at, last_optimized_at,
        hit_count, success_count, manual_override_count, health_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shadow.shadow_id,
        shadow.project_id,
        shadow.skill_id,
        shadow.runtime ?? 'codex',
        shadow.origin_skill_id,
        shadow.origin_version_at_fork,
        shadow.shadow_path,
        shadow.current_revision,
        shadow.status,
        shadow.created_at,
        shadow.last_optimized_at,
        0,
        0,
        0,
        100.0,
      ]
    );
    this.adapter.save();
  }

  upsertShadowSkillInTransaction(shadow: ProjectSkillShadow): void {
    this.adapter.database.run(
      `INSERT OR REPLACE INTO shadow_skills (
        shadow_id, project_id, skill_id, runtime, origin_skill_id, origin_version_at_fork,
        shadow_path, current_revision, status, created_at, last_optimized_at,
        hit_count, success_count, manual_override_count, health_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shadow.shadow_id,
        shadow.project_id,
        shadow.skill_id,
        shadow.runtime ?? 'codex',
        shadow.origin_skill_id,
        shadow.origin_version_at_fork,
        shadow.shadow_path,
        shadow.current_revision,
        shadow.status,
        shadow.created_at,
        shadow.last_optimized_at,
        0,
        0,
        0,
        100.0,
      ]
    );
  }

  getShadowSkill(projectId: string, skillId: string): ProjectSkillShadow | null {
    const stmt = this.adapter.database.prepare(
      'SELECT * FROM shadow_skills WHERE project_id = ? AND skill_id = ?'
    );
    stmt.bind([projectId, skillId]);

    if (!stmt.step()) {
      stmt.free();
      return null;
    }

    const row = stmt.getAsObject() as Record<string, unknown>;
    stmt.free();
    return mapShadowSkillRow(row);
  }

  listShadowSkills(projectId: string): ProjectSkillShadow[] {
    const stmt = this.adapter.database.prepare(
      'SELECT * FROM shadow_skills WHERE project_id = ? ORDER BY created_at DESC'
    );
    stmt.bind([projectId]);

    const results: ProjectSkillShadow[] = [];
    while (stmt.step()) {
      results.push(mapShadowSkillRow(stmt.getAsObject() as Record<string, unknown>));
    }
    stmt.free();
    return results;
  }

  updateShadowStatus(shadowId: string, status: ShadowStatus): void {
    this.adapter.database.run('UPDATE shadow_skills SET status = ? WHERE shadow_id = ?', [
      status,
      shadowId,
    ]);
    this.adapter.save();
  }

  updateShadowRevision(shadowId: string, revision: number): void {
    this.adapter.database.run('UPDATE shadow_skills SET current_revision = ? WHERE shadow_id = ?', [
      revision,
      shadowId,
    ]);
    this.adapter.save();
  }

  addEvolutionRecordIndex(record: EvolutionRecordIndex): void {
    this.adapter.database.run(
      'INSERT INTO evolution_records_index (shadow_id, revision, timestamp, change_type, source_sessions, confidence) VALUES (?, ?, ?, ?, ?, ?)',
      [
        record.shadow_id,
        record.revision,
        record.timestamp,
        record.change_type,
        JSON.stringify(record.source_sessions),
        record.confidence,
      ]
    );
    this.adapter.save();
  }

  getEvolutionRecordIndex(
    shadowId: string,
    limit = 50
  ): Array<{
    id: number;
    revision: number;
    timestamp: string;
    change_type: string;
    source_sessions: string[];
    confidence: number;
  }> {
    const stmt = this.adapter.database.prepare(
      'SELECT * FROM evolution_records_index WHERE shadow_id = ? ORDER BY revision DESC LIMIT ?'
    );
    stmt.bind([shadowId, limit]);

    const results: Array<{
      id: number;
      revision: number;
      timestamp: string;
      change_type: string;
      source_sessions: string[];
      confidence: number;
    }> = [];

    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      results.push({
        id: row.id as number,
        revision: row.revision as number,
        timestamp: row.timestamp as string,
        change_type: row.change_type as string,
        source_sessions: JSON.parse(row.source_sessions as string) as string[],
        confidence: row.confidence as number,
      });
    }
    stmt.free();
    return results;
  }

  addSnapshot(snapshot: SnapshotRecord): void {
    this.adapter.database.run(
      'INSERT INTO snapshots (shadow_id, revision, timestamp, file_path, content_hash) VALUES (?, ?, ?, ?, ?)',
      [
        snapshot.shadow_id,
        snapshot.revision,
        snapshot.timestamp,
        snapshot.file_path,
        snapshot.content_hash,
      ]
    );
    this.adapter.save();
  }

  getSnapshots(shadowId: string): Array<{
    id: number;
    revision: number;
    timestamp: string;
    file_path: string;
    content_hash: string;
  }> {
    const stmt = this.adapter.database.prepare(
      'SELECT * FROM snapshots WHERE shadow_id = ? ORDER BY revision DESC'
    );
    stmt.bind([shadowId]);

    const results: Array<{
      id: number;
      revision: number;
      timestamp: string;
      file_path: string;
      content_hash: string;
    }> = [];

    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      results.push({
        id: row.id as number,
        revision: row.revision as number,
        timestamp: row.timestamp as string,
        file_path: row.file_path as string,
        content_hash: row.content_hash as string,
      });
    }
    stmt.free();
    return results;
  }

  getLatestSnapshot(shadowId: string): {
    id: number;
    revision: number;
    timestamp: string;
    file_path: string;
    content_hash: string;
  } | null {
    const stmt = this.adapter.database.prepare(
      'SELECT * FROM snapshots WHERE shadow_id = ? ORDER BY revision DESC LIMIT 1'
    );
    stmt.bind([shadowId]);

    if (!stmt.step()) {
      stmt.free();
      return null;
    }

    const row = stmt.getAsObject() as Record<string, unknown>;
    stmt.free();
    return {
      id: row.id as number,
      revision: row.revision as number,
      timestamp: row.timestamp as string,
      file_path: row.file_path as string,
      content_hash: row.content_hash as string,
    };
  }
}
