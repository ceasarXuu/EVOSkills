import type { OriginSkill } from '../../types/index.js';
import { SQLiteDbAdapter } from './sqlite-db-adapter.js';

export class SQLiteOriginSkillRepo {
  constructor(private readonly adapter: SQLiteDbAdapter) {}

  upsertOriginSkill(origin: OriginSkill): void {
    this.adapter.database.run(
      `INSERT OR REPLACE INTO origin_skills (
        skill_id, origin_path, origin_version, source, installed_at, last_seen_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        origin.skill_id,
        origin.origin_path,
        origin.origin_version,
        origin.source,
        origin.installed_at,
        origin.last_seen_at,
      ]
    );
    this.adapter.save();
  }

  getOriginSkill(skillId: string): OriginSkill | null {
    const stmt = this.adapter.database.prepare('SELECT * FROM origin_skills WHERE skill_id = ?');
    stmt.bind([skillId]);

    if (!stmt.step()) {
      stmt.free();
      return null;
    }

    const row = stmt.getAsObject() as Record<string, unknown>;
    stmt.free();
    return {
      skill_id: row.skill_id as string,
      origin_path: row.origin_path as string,
      origin_version: row.origin_version as string,
      source: row.source as OriginSkill['source'],
      installed_at: row.installed_at as string,
      last_seen_at: row.last_seen_at as string,
    };
  }

  listOriginSkills(): OriginSkill[] {
    const stmt = this.adapter.database.prepare('SELECT * FROM origin_skills ORDER BY skill_id');
    const results: OriginSkill[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      results.push({
        skill_id: row.skill_id as string,
        origin_path: row.origin_path as string,
        origin_version: row.origin_version as string,
        source: row.source as OriginSkill['source'],
        installed_at: row.installed_at as string,
        last_seen_at: row.last_seen_at as string,
      });
    }
    stmt.free();
    return results;
  }
}
