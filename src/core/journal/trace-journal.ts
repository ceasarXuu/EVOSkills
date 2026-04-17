import type { Database } from 'sql.js';
import { createChildLogger } from '../../utils/logger.js';
import type { Trace, TraceEventType, TraceStatus, RuntimeType } from '../../types/index.js';
import type { TraceQuery, TraceStats } from './journal-types.js';
import { JournalSQLiteStore } from './journal-sqlite-store.js';

const logger = createChildLogger('trace-journal');

export function createTraceJournalTables(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS traces (
      trace_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      turn_id TEXT,
      parent_trace_id TEXT,
      runtime TEXT NOT NULL,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      content TEXT,
      metadata TEXT,
      skill_refs TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_traces_session ON traces(session_id);
    CREATE INDEX IF NOT EXISTS idx_traces_turn ON traces(turn_id);
    CREATE INDEX IF NOT EXISTS idx_traces_runtime ON traces(runtime);
    CREATE INDEX IF NOT EXISTS idx_traces_event_type ON traces(event_type);
    CREATE INDEX IF NOT EXISTS idx_traces_status ON traces(status);
    CREATE INDEX IF NOT EXISTS idx_traces_timestamp ON traces(timestamp);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS trace_skills (
      trace_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      skill_ref TEXT NOT NULL,
      PRIMARY KEY (trace_id, skill_id),
      FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_trace_skills_skill_id ON trace_skills(skill_id);
  `);
}

export class TraceJournal {
  constructor(private readonly sqliteStore: JournalSQLiteStore) {}

  storeTrace(trace: Trace): void {
    this.sqliteStore.queueWrite(() => {
      const db = this.sqliteStore.database;
      const content =
        trace.assistant_output || trace.tool_result
          ? JSON.stringify({
              assistant_output: trace.assistant_output,
              tool_result: trace.tool_result,
            })
          : null;
      const metadata = trace.metadata ? JSON.stringify(trace.metadata) : null;
      const skillRefs = trace.skill_refs ? JSON.stringify(trace.skill_refs) : null;

      const stmt = db.prepare(`
        INSERT OR REPLACE INTO traces
        (trace_id, session_id, turn_id, parent_trace_id, runtime, event_type, status, timestamp, content, metadata, skill_refs)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        trace.trace_id,
        trace.session_id,
        trace.turn_id,
        null,
        trace.runtime,
        trace.event_type,
        trace.status,
        trace.timestamp,
        content,
        metadata,
        skillRefs,
      ]);
      stmt.free();

      if (trace.skill_refs && trace.skill_refs.length > 0) {
        const deleteStmt = db.prepare('DELETE FROM trace_skills WHERE trace_id = ?');
        deleteStmt.run([trace.trace_id]);
        deleteStmt.free();

        const insertStmt = db.prepare(`
          INSERT OR REPLACE INTO trace_skills (trace_id, skill_id, skill_ref)
          VALUES (?, ?, ?)
        `);

        for (const skillRef of trace.skill_refs) {
          const skillId = skillRef.includes('@') ? skillRef.split('@')[0] : skillRef;
          insertStmt.run([trace.trace_id, skillId, skillRef]);
        }
        insertStmt.free();
      }

      this.enforceRetention();
      logger.debug(`Stored trace: ${trace.trace_id}`);
    });
  }

  store(trace: Trace): void {
    this.storeTrace(trace);
  }

  storeBatch(traces: Trace[]): void {
    for (const trace of traces) {
      this.storeTrace(trace);
    }
    logger.info(`Stored ${traces.length} traces`);
  }

  get(traceId: string): Trace | undefined {
    const stmt = this.sqliteStore.database.prepare('SELECT * FROM traces WHERE trace_id = ?');
    stmt.bind([traceId]);

    if (!stmt.step()) {
      stmt.free();
      return undefined;
    }

    const trace = this.rowToTrace(stmt.getAsObject() as Record<string, unknown>);
    stmt.free();
    return trace;
  }

  query(query: TraceQuery = {}): Trace[] {
    let sql = 'SELECT * FROM traces WHERE 1=1';
    const params: Array<string | number> = [];

    if (query.sessionId) {
      sql += ' AND session_id = ?';
      params.push(query.sessionId);
    }

    if (query.runtime) {
      sql += ' AND runtime = ?';
      params.push(query.runtime);
    }

    if (query.eventType) {
      sql += ' AND event_type = ?';
      params.push(query.eventType);
    }

    if (query.status) {
      sql += ' AND status = ?';
      params.push(query.status);
    }

    if (query.startTime) {
      sql += ' AND timestamp >= ?';
      params.push(query.startTime.toISOString());
    }

    if (query.endTime) {
      sql += ' AND timestamp <= ?';
      params.push(query.endTime.toISOString());
    }

    if (query.skillRef) {
      sql += ' AND trace_id IN (SELECT trace_id FROM trace_skills WHERE skill_id = ?)';
      params.push(query.skillRef);
    }

    sql += ' ORDER BY timestamp DESC';

    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(query.limit);

      if (query.offset) {
        sql += ' OFFSET ?';
        params.push(query.offset);
      }
    }

    const stmt = this.sqliteStore.database.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }

    const results: Trace[] = [];
    while (stmt.step()) {
      results.push(this.rowToTrace(stmt.getAsObject() as Record<string, unknown>));
    }
    stmt.free();
    return results;
  }

  getBySession(sessionId: string): Trace[] {
    const stmt = this.sqliteStore.database.prepare(
      'SELECT * FROM traces WHERE session_id = ? ORDER BY timestamp ASC'
    );
    stmt.bind([sessionId]);

    const results: Trace[] = [];
    while (stmt.step()) {
      results.push(this.rowToTrace(stmt.getAsObject() as Record<string, unknown>));
    }
    stmt.free();
    return results;
  }

  getBySkill(skillId: string): Trace[] {
    const stmt = this.sqliteStore.database.prepare(`
      SELECT t.* FROM traces t
      JOIN trace_skills ts ON t.trace_id = ts.trace_id
      WHERE ts.skill_id = ?
      ORDER BY t.timestamp DESC
    `);
    stmt.bind([skillId]);

    const results: Trace[] = [];
    while (stmt.step()) {
      results.push(this.rowToTrace(stmt.getAsObject() as Record<string, unknown>));
    }
    stmt.free();
    return results;
  }

  getAll(): Trace[] {
    return this.query();
  }

  getSessionIds(): string[] {
    const stmt = this.sqliteStore.database.prepare('SELECT DISTINCT session_id FROM traces');
    const ids: string[] = [];

    while (stmt.step()) {
      ids.push(stmt.getAsObject().session_id as string);
    }
    stmt.free();
    return ids;
  }

  getSkillIds(): string[] {
    const stmt = this.sqliteStore.database.prepare('SELECT DISTINCT skill_id FROM trace_skills');
    const ids: string[] = [];

    while (stmt.step()) {
      ids.push(stmt.getAsObject().skill_id as string);
    }
    stmt.free();
    return ids;
  }

  delete(traceId: string): boolean {
    const db = this.sqliteStore.database;
    const stmt = db.prepare('DELETE FROM traces WHERE trace_id = ?');
    stmt.run([traceId]);
    const changes = db.getRowsModified();
    stmt.free();

    if (changes > 0) {
      logger.debug(`Deleted trace: ${traceId}`);
      this.sqliteStore.queueWrite(() => {});
      return true;
    }

    return false;
  }

  clear(): void {
    const db = this.sqliteStore.database;
    db.exec('DELETE FROM traces');
    db.exec('DELETE FROM trace_skills');
    logger.info('Cleared all traces');
    this.sqliteStore.queueWrite(() => {});
  }

  getStats(): TraceStats {
    const db = this.sqliteStore.database;
    const totalTraces = this.count();

    const byRuntime: Record<RuntimeType, number> = { codex: 0, opencode: 0, claude: 0 };
    const runtimeStmt = db.prepare('SELECT runtime, COUNT(*) as count FROM traces GROUP BY runtime');
    while (runtimeStmt.step()) {
      const row = runtimeStmt.getAsObject();
      byRuntime[row.runtime as RuntimeType] = row.count as number;
    }
    runtimeStmt.free();

    const byEventType: Record<TraceEventType, number> = {
      user_input: 0,
      assistant_output: 0,
      tool_call: 0,
      tool_result: 0,
      file_change: 0,
      retry: 0,
      status: 0,
    };
    const eventStmt = db.prepare(
      'SELECT event_type, COUNT(*) as count FROM traces GROUP BY event_type'
    );
    while (eventStmt.step()) {
      const row = eventStmt.getAsObject();
      byEventType[row.event_type as TraceEventType] = row.count as number;
    }
    eventStmt.free();

    const byStatus: Record<TraceStatus, number> = {
      success: 0,
      failure: 0,
      retry: 0,
      interrupted: 0,
    };
    const statusStmt = db.prepare('SELECT status, COUNT(*) as count FROM traces GROUP BY status');
    while (statusStmt.step()) {
      const row = statusStmt.getAsObject();
      byStatus[row.status as TraceStatus] = row.count as number;
    }
    statusStmt.free();

    let earliest: Date | null = null;
    let latest: Date | null = null;
    const timeStmt = db.prepare('SELECT MIN(timestamp) as earliest, MAX(timestamp) as latest FROM traces');
    if (timeStmt.step()) {
      const row = timeStmt.getAsObject();
      if (row.earliest) {
        earliest = new Date(row.earliest as string);
      }
      if (row.latest) {
        latest = new Date(row.latest as string);
      }
    }
    timeStmt.free();

    return {
      totalTraces,
      byRuntime,
      byEventType,
      byStatus,
      timeRange: { earliest, latest },
    };
  }

  count(): number {
    const stmt = this.sqliteStore.database.prepare('SELECT COUNT(*) as count FROM traces');
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();
    return row.count as number;
  }

  exportToJSON(): string {
    return JSON.stringify(this.getAll(), null, 2);
  }

  importFromJSON(json: string): void {
    try {
      const traces = JSON.parse(json) as Trace[];
      this.storeBatch(traces);
      logger.info(`Imported ${traces.length} traces from JSON`);
    } catch (error) {
      logger.error('Failed to import traces from JSON:', error);
      throw error;
    }
  }

  private rowToTrace(row: Record<string, unknown>): Trace {
    const content = row.content
      ? (JSON.parse(row.content as string) as Record<string, unknown>)
      : {};

    return {
      trace_id: row.trace_id as string,
      session_id: row.session_id as string,
      turn_id: (row.turn_id as string) || '',
      runtime: row.runtime as RuntimeType,
      event_type: row.event_type as TraceEventType,
      status: row.status as TraceStatus,
      timestamp: row.timestamp as string,
      user_input: content.user_input as string | undefined,
      assistant_output: content.assistant_output as string | undefined,
      tool_name: content.tool_name as string | undefined,
      tool_args: content.tool_args as Record<string, unknown> | undefined,
      tool_result: content.tool_result as Record<string, unknown> | undefined,
      files_changed: content.files_changed as string[] | undefined,
      skill_refs: row.skill_refs ? (JSON.parse(row.skill_refs as string) as string[]) : undefined,
      metadata: row.metadata
        ? (JSON.parse(row.metadata as string) as Record<string, unknown> | undefined)
        : undefined,
    };
  }

  private enforceRetention(): void {
    const db = this.sqliteStore.database;
    const { maxTraces, retentionDays } = this.sqliteStore.settings;

    if (maxTraces) {
      const count = this.count();
      if (count > maxTraces) {
        const toDelete = count - maxTraces;
        const stmt = db.prepare(`
          DELETE FROM traces WHERE trace_id IN (
            SELECT trace_id FROM traces ORDER BY timestamp ASC LIMIT ?
          )
        `);
        stmt.run([toDelete]);
        stmt.free();
        logger.info(`Enforced max traces limit, deleted ${toDelete} old traces`);
      }
    }

    if (retentionDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const stmt = db.prepare('DELETE FROM traces WHERE timestamp < ?');
      stmt.run([cutoffDate.toISOString()]);
      const changes = db.getRowsModified();
      stmt.free();

      if (changes > 0) {
        logger.info(`Enforced retention policy, deleted ${changes} old traces`);
      }
    }
  }
}
