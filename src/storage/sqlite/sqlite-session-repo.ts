import type { RuntimeType, Session } from '../../types/index.js';
import { SQLiteDbAdapter } from './sqlite-db-adapter.js';

type TraceIndexRecord = {
  trace_id: string;
  session_id: string;
  runtime: RuntimeType;
  event_type: string;
  timestamp: string;
  status: string;
};

export class SQLiteSessionRepo {
  constructor(private readonly adapter: SQLiteDbAdapter) {}

  createSession(session: Session): void {
    this.adapter.database.run(
      'INSERT INTO sessions (session_id, runtime, project_id, started_at, ended_at, trace_count) VALUES (?, ?, ?, ?, ?, ?)',
      [
        session.session_id,
        session.runtime,
        session.project_id,
        session.started_at,
        session.ended_at,
        session.trace_count,
      ]
    );
    this.adapter.save();
  }

  getSession(sessionId: string): Session | null {
    const stmt = this.adapter.database.prepare('SELECT * FROM sessions WHERE session_id = ?');
    stmt.bind([sessionId]);

    if (!stmt.step()) {
      stmt.free();
      return null;
    }

    const row = stmt.getAsObject() as Record<string, unknown>;
    stmt.free();
    return {
      session_id: row.session_id as string,
      runtime: row.runtime as RuntimeType,
      project_id: row.project_id as string | null,
      started_at: row.started_at as string,
      ended_at: row.ended_at as string | null,
      trace_count: row.trace_count as number,
    };
  }

  incrementSessionTraceCount(sessionId: string): void {
    this.adapter.database.run(
      'UPDATE sessions SET trace_count = trace_count + 1 WHERE session_id = ?',
      [sessionId]
    );
    this.adapter.save();
  }

  addTraceIndex(trace: TraceIndexRecord): void {
    this.adapter.database.run(
      'INSERT INTO traces_index (trace_id, session_id, runtime, event_type, timestamp, status) VALUES (?, ?, ?, ?, ?, ?)',
      [
        trace.trace_id,
        trace.session_id,
        trace.runtime,
        trace.event_type,
        trace.timestamp,
        trace.status,
      ]
    );
    this.adapter.save();
  }

  getTraceIndexBySession(
    sessionId: string,
    limit = 100
  ): Array<{
    trace_id: string;
    event_type: string;
    timestamp: string;
    status: string;
  }> {
    const stmt = this.adapter.database.prepare(
      'SELECT trace_id, event_type, timestamp, status FROM traces_index WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?'
    );
    stmt.bind([sessionId, limit]);

    const results: Array<{
      trace_id: string;
      event_type: string;
      timestamp: string;
      status: string;
    }> = [];

    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      results.push({
        trace_id: row.trace_id as string,
        event_type: row.event_type as string,
        timestamp: row.timestamp as string,
        status: row.status as string,
      });
    }
    stmt.free();
    return results;
  }
}
