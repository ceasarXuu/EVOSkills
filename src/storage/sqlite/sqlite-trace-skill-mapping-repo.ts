import { createChildLogger } from '../../utils/logger.js';
import { SQLiteDbAdapter } from './sqlite-db-adapter.js';

const logger = createChildLogger('sqlite-trace-skill-mapping-repo');

type TraceSkillMapping = {
  trace_id: string;
  skill_id: string;
  shadow_id: string | null;
  confidence: number;
  reason: string;
  mapped_at: string;
};

export class SQLiteTraceSkillMappingRepo {
  constructor(private readonly adapter: SQLiteDbAdapter) {}

  upsertTraceSkillMapping(mapping: TraceSkillMapping): void {
    this.adapter.database.run(
      `INSERT OR REPLACE INTO trace_skill_mappings (
        trace_id, skill_id, shadow_id, confidence, reason, mapped_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        mapping.trace_id,
        mapping.skill_id,
        mapping.shadow_id,
        mapping.confidence,
        mapping.reason,
        mapping.mapped_at,
      ]
    );
    this.adapter.save();
  }

  getTraceSkillMappings(skillId: string): TraceSkillMapping[] {
    const stmt = this.adapter.database.prepare(
      'SELECT * FROM trace_skill_mappings WHERE skill_id = ? ORDER BY mapped_at DESC'
    );
    stmt.bind([skillId]);

    const results: TraceSkillMapping[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      results.push({
        trace_id: row.trace_id as string,
        skill_id: row.skill_id as string,
        shadow_id: row.shadow_id as string | null,
        confidence: row.confidence as number,
        reason: row.reason as string,
        mapped_at: row.mapped_at as string,
      });
    }
    stmt.free();
    return results;
  }

  getTraceSkillMappingByTraceId(traceId: string): TraceSkillMapping[] {
    const stmt = this.adapter.database.prepare('SELECT * FROM trace_skill_mappings WHERE trace_id = ?');
    stmt.bind([traceId]);

    const results: TraceSkillMapping[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      results.push({
        trace_id: row.trace_id as string,
        skill_id: row.skill_id as string,
        shadow_id: row.shadow_id as string | null,
        confidence: row.confidence as number,
        reason: row.reason as string,
        mapped_at: row.mapped_at as string,
      });
    }
    stmt.free();
    return results;
  }

  getTraceSkillMappingStats(): {
    total_mappings: number;
    by_skill: Record<string, number>;
    avg_confidence: number;
  } {
    const totalStmt = this.adapter.database.prepare('SELECT COUNT(*) as total FROM trace_skill_mappings');
    totalStmt.step();
    const totalRow = totalStmt.getAsObject() as Record<string, unknown>;
    totalStmt.free();

    const bySkillStmt = this.adapter.database.prepare(
      'SELECT skill_id, COUNT(*) as count FROM trace_skill_mappings GROUP BY skill_id'
    );
    const by_skill: Record<string, number> = {};
    while (bySkillStmt.step()) {
      const row = bySkillStmt.getAsObject() as Record<string, unknown>;
      by_skill[row.skill_id as string] = row.count as number;
    }
    bySkillStmt.free();

    const avgStmt = this.adapter.database.prepare('SELECT AVG(confidence) as avg_conf FROM trace_skill_mappings');
    avgStmt.step();
    const avgRow = avgStmt.getAsObject() as Record<string, unknown>;
    avgStmt.free();

    return {
      total_mappings: totalRow.total as number,
      by_skill,
      avg_confidence: (avgRow.avg_conf as number) || 0,
    };
  }

  cleanupTraceSkillMappings(retentionDays: number): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoff = cutoffDate.toISOString();

    const stmt = this.adapter.database.prepare('DELETE FROM trace_skill_mappings WHERE mapped_at < ?');
    stmt.bind([cutoff]);
    stmt.step();
    const changes = this.adapter.database.getRowsModified();
    stmt.free();
    this.adapter.save();

    logger.info('Cleaned up old trace-skill mappings', { deleted: changes, retentionDays });
    return changes;
  }
}
