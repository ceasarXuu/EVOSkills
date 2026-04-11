/**
 * SQLite Journal
 *
 * 负责 Trace 的持久化存储，使用 SQLite 数据库。
 * 提供高性能的 Trace 存储、查询和索引功能。
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import { createChildLogger } from '../../utils/logger.js';
import { hashString } from '../../utils/hash.js';
import { parseShadowId } from '../../utils/parse.js';
import type { Trace, TraceEventType, TraceStatus, RuntimeType } from '../../types/index.js';

const logger = createChildLogger('journal');

export interface JournalRecord {
  revision: number;
  timestamp: string;
  change_type: string;
  applied_by: string;
  reason: string;
  source_sessions: string[];
}

export interface JournalOptions {
  projectPath: string;
  dbPath?: string;
  maxTraces?: number;
  retentionDays?: number;
}

export interface TraceQuery {
  sessionId?: string;
  runtime?: RuntimeType;
  eventType?: TraceEventType;
  status?: TraceStatus;
  skillRef?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

export interface TraceStats {
  totalTraces: number;
  byRuntime: Record<RuntimeType, number>;
  byEventType: Record<TraceEventType, number>;
  byStatus: Record<TraceStatus, number>;
  timeRange: {
    earliest: Date | null;
    latest: Date | null;
  };
}

/**
 * SQLite Journal for Trace persistence
 *
 * Responsibilities:
 * 1. Store traces in SQLite database
 * 2. Provide query and filter capabilities with SQL
 * 3. Manage trace retention
 * 4. Provide statistics
 * 5. Persist data across restarts
 */
export class Journal {
  private options: Required<JournalOptions>;
  private SQL: SqlJsStatic | null = null;
  private db: Database | null = null;
  private initialized = false;
  private writeQueue: Array<() => void> = [];
  private isProcessingQueue = false;

  constructor(options: JournalOptions) {
    this.options = {
      maxTraces: 10000,
      retentionDays: 30,
      dbPath: join(options.projectPath, '.ornn', 'journal.db'),
      ...options,
    };
  }

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize sql.js
      this.SQL = await initSqlJs();

      // Ensure directory exists
      const dbDir = dirname(this.options.dbPath);
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
      }

      // Try to load existing database or create new
      try {
        const fs = await import('fs');
        if (existsSync(this.options.dbPath)) {
          const data = fs.readFileSync(this.options.dbPath);
          this.db = new this.SQL.Database(data);
          logger.debug('Loaded existing journal database');
        } else {
          this.db = new this.SQL.Database();
          logger.debug('Created new journal database');
        }
      } catch {
        this.db = new this.SQL.Database();
        logger.debug('Created new journal database');
      }

      // Create tables
      this.createTables();

      this.initialized = true;
      logger.debug('Journal initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize journal:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    // Main traces table
    this.db.exec(`
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

    // Indexes for efficient queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_traces_session ON traces(session_id);
      CREATE INDEX IF NOT EXISTS idx_traces_turn ON traces(turn_id);
      CREATE INDEX IF NOT EXISTS idx_traces_runtime ON traces(runtime);
      CREATE INDEX IF NOT EXISTS idx_traces_event_type ON traces(event_type);
      CREATE INDEX IF NOT EXISTS idx_traces_status ON traces(status);
      CREATE INDEX IF NOT EXISTS idx_traces_timestamp ON traces(timestamp);
    `);

    // Skill references table (many-to-many)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS trace_skills (
        trace_id TEXT NOT NULL,
        skill_id TEXT NOT NULL,
        skill_ref TEXT NOT NULL,
        PRIMARY KEY (trace_id, skill_id),
        FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
      );
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_trace_skills_skill_id ON trace_skills(skill_id);
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS evolution_records (
        shadow_id TEXT NOT NULL,
        revision INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        change_type TEXT NOT NULL,
        applied_by TEXT NOT NULL,
        reason TEXT NOT NULL,
        source_sessions TEXT NOT NULL,
        patch TEXT,
        before_hash TEXT,
        after_hash TEXT,
        PRIMARY KEY (shadow_id, revision)
      );
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_evolution_records_shadow
      ON evolution_records(shadow_id, revision DESC);
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        shadow_id TEXT NOT NULL,
        revision INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        file_path TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        PRIMARY KEY (shadow_id, revision)
      );
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_snapshots_shadow
      ON snapshots(shadow_id, revision ASC);
    `);
  }

  /**
   * Persist database to disk
   */
  private async persist(): Promise<void> {
    if (!this.db) return;

    try {
      const data = this.db.export();
      const fs = await import('fs');
      const path = await import('path');
      
      const dbDir = path.dirname(this.options.dbPath);
      await fs.promises.mkdir(dbDir, { recursive: true });
      
      await fs.promises.writeFile(this.options.dbPath, Buffer.from(data));
    } catch (error) {
      logger.error('Failed to persist journal:', error);
      throw error;
    }
  }

  private persistSync(): void {
    if (!this.db) return;

    const data = this.db.export();
    mkdirSync(dirname(this.options.dbPath), { recursive: true });
    writeFileSync(this.options.dbPath, Buffer.from(data));
  }

  /**
   * Queue a write operation
   */
  private queueWrite(operation: () => void): void {
    this.writeQueue.push(operation);
    void this.processWriteQueue();
  }

  /**
   * Process write queue with debouncing
   */
  private async processWriteQueue(): Promise<void> {
    if (this.isProcessingQueue || this.writeQueue.length === 0) return;

    this.isProcessingQueue = true;

    // Debounce: wait for more writes
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      // Execute all queued operations
      while (this.writeQueue.length > 0) {
        const operation = this.writeQueue.shift();
        if (operation) operation();
      }

      // Persist to disk
      await this.persist();
    } catch (error) {
      logger.error('Error processing write queue:', error);
    } finally {
      this.isProcessingQueue = false;

      // Check if more operations were queued during processing
      if (this.writeQueue.length > 0) {
        void this.processWriteQueue();
      }
    }
  }

  /**
   * Store a trace
   */
  store(trace: Trace): void {
    if (!this.db) throw new Error('Database not initialized');

    this.queueWrite(() => {
      if (!this.db) {
        logger.warn(`Skipping trace ${trace.trace_id}: database is closed or not initialized`);
        return;
      }

      try {
        // Serialize complex fields
        const content =
          trace.assistant_output || trace.tool_result
            ? JSON.stringify({
                assistant_output: trace.assistant_output,
                tool_result: trace.tool_result,
              })
            : null;
        const metadata = trace.metadata ? JSON.stringify(trace.metadata) : null;
        const skillRefs = trace.skill_refs ? JSON.stringify(trace.skill_refs) : null;

        // Insert or replace trace
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO traces 
          (trace_id, session_id, turn_id, parent_trace_id, runtime, event_type, status, timestamp, content, metadata, skill_refs)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run([
          trace.trace_id,
          trace.session_id,
          trace.turn_id,
          null, // parent_trace_id not in Trace type
          trace.runtime,
          trace.event_type,
          trace.status,
          trace.timestamp,
          content,
          metadata,
          skillRefs,
        ]);
        stmt.free();

        // Update skill references
        if (trace.skill_refs && trace.skill_refs.length > 0) {
          // Delete existing skill refs
          const deleteStmt = this.db.prepare('DELETE FROM trace_skills WHERE trace_id = ?');
          deleteStmt.run([trace.trace_id]);
          deleteStmt.free();

          // Insert new skill refs
          const insertStmt = this.db.prepare(`
            INSERT OR REPLACE INTO trace_skills (trace_id, skill_id, skill_ref)
            VALUES (?, ?, ?)
          `);

          for (const skillRef of trace.skill_refs) {
            const skillId = (skillRef.includes('@') ? skillRef.split('@')[0] : skillRef);
            insertStmt.run([trace.trace_id, skillId, skillRef]);
          }
          insertStmt.free();
        }

        logger.debug(`Stored trace: ${trace.trace_id}`);
      } catch (error) {
        logger.error(`Failed to store trace ${trace.trace_id}:`, error);
        throw error;
      }
    });

    // Enforce retention
    this.enforceRetention();
  }

  /**
   * Store multiple traces
   */
  storeBatch(traces: Trace[]): void {
    for (const trace of traces) {
      this.store(trace);
    }
    logger.info(`Stored ${traces.length} traces`);
  }

  /**
   * Get a trace by ID
   */
  get(traceId: string): Trace | undefined {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM traces WHERE trace_id = ?');
    const result = stmt.getAsObject([traceId]) as Record<string, unknown> | undefined;
    stmt.free();

    if (!result) return undefined;

    return this.rowToTrace(result);
  }

  /**
   * Convert database row to Trace object
   */
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

  /**
   * Query traces
   */
  query(query: TraceQuery = {}): Trace[] {
    if (!this.db) throw new Error('Database not initialized');

    let sql = 'SELECT * FROM traces WHERE 1=1';
    const params: unknown[] = [];

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

    // Filter by skill reference
    if (query.skillRef) {
      sql += ` AND trace_id IN (SELECT trace_id FROM trace_skills WHERE skill_id = ?)`;
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

    const stmt = this.db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params as string[]);
    }
    const results: Trace[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(this.rowToTrace(row));
    }

    stmt.free();
    return results;
  }

  /**
   * Get traces by session ID
   */
  getBySession(sessionId: string): Trace[] {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(
      'SELECT * FROM traces WHERE session_id = ? ORDER BY timestamp ASC'
    );
    const results: Trace[] = [];

    stmt.bind([sessionId]);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(this.rowToTrace(row));
    }

    stmt.free();
    return results;
  }

  /**
   * Get traces by skill ID
   */
  getBySkill(skillId: string): Trace[] {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT t.* FROM traces t
      JOIN trace_skills ts ON t.trace_id = ts.trace_id
      WHERE ts.skill_id = ?
      ORDER BY t.timestamp DESC
    `);

    const results: Trace[] = [];
    stmt.bind([skillId]);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(this.rowToTrace(row));
    }

    stmt.free();
    return results;
  }

  /**
   * Get all traces
   */
  getAll(): Trace[] {
    return this.query();
  }

  /**
   * Get unique session IDs
   */
  getSessionIds(): string[] {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT DISTINCT session_id FROM traces');
    const ids: string[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject();
      ids.push(row.session_id as string);
    }

    stmt.free();
    return ids;
  }

  /**
   * Get unique skill IDs
   */
  getSkillIds(): string[] {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT DISTINCT skill_id FROM trace_skills');
    const ids: string[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject();
      ids.push(row.skill_id as string);
    }

    stmt.free();
    return ids;
  }

  /**
   * Delete a trace
   */
  delete(traceId: string): boolean {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM traces WHERE trace_id = ?');
    stmt.run([traceId]);
    const changes = this.db.getRowsModified();
    stmt.free();

    if (changes > 0) {
      logger.debug(`Deleted trace: ${traceId}`);
      this.queueWrite(() => {}); // Trigger persist
      return true;
    }

    return false;
  }

  /**
   * Clear all traces
   */
  clear(): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.exec('DELETE FROM traces');
    this.db.exec('DELETE FROM trace_skills');

    logger.info('Cleared all traces');
    this.queueWrite(() => {}); // Trigger persist
  }

  /**
   * Get store statistics
   */
  getStats(): TraceStats {
    if (!this.db) throw new Error('Database not initialized');

    const totalTraces = this.count();

    // Count by runtime
    const byRuntime: Record<RuntimeType, number> = { codex: 0, opencode: 0, claude: 0 };
    const runtimeStmt = this.db.prepare(
      'SELECT runtime, COUNT(*) as count FROM traces GROUP BY runtime'
    );
    while (runtimeStmt.step()) {
      const row = runtimeStmt.getAsObject();
      byRuntime[row.runtime as RuntimeType] = row.count as number;
    }
    runtimeStmt.free();

    // Count by event type
    const byEventType: Record<TraceEventType, number> = {
      user_input: 0,
      assistant_output: 0,
      tool_call: 0,
      tool_result: 0,
      file_change: 0,
      retry: 0,
      status: 0,
    };
    const eventStmt = this.db.prepare(
      'SELECT event_type, COUNT(*) as count FROM traces GROUP BY event_type'
    );
    while (eventStmt.step()) {
      const row = eventStmt.getAsObject();
      byEventType[row.event_type as TraceEventType] = row.count as number;
    }
    eventStmt.free();

    // Count by status
    const byStatus: Record<TraceStatus, number> = {
      success: 0,
      failure: 0,
      retry: 0,
      interrupted: 0,
    };
    const statusStmt = this.db.prepare(
      'SELECT status, COUNT(*) as count FROM traces GROUP BY status'
    );
    while (statusStmt.step()) {
      const row = statusStmt.getAsObject();
      byStatus[row.status as TraceStatus] = row.count as number;
    }
    statusStmt.free();

    // Time range
    let earliest: Date | null = null;
    let latest: Date | null = null;

    const timeStmt = this.db.prepare(
      'SELECT MIN(timestamp) as earliest, MAX(timestamp) as latest FROM traces'
    );
    if (timeStmt.step()) {
      const row = timeStmt.getAsObject();
      if (row.earliest) earliest = new Date(row.earliest as string);
      if (row.latest) latest = new Date(row.latest as string);
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

  /**
   * Get count of traces
   */
  count(): number {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM traces');
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();

    return row.count as number;
  }

  /**
   * Enforce retention policy
   */
  private enforceRetention(): void {
    if (!this.db) return;

    // Enforce max traces limit
    if (this.options.maxTraces) {
      const count = this.count();
      if (count > this.options.maxTraces) {
        const toDelete = count - this.options.maxTraces;
        const stmt = this.db.prepare(`
          DELETE FROM traces WHERE trace_id IN (
            SELECT trace_id FROM traces ORDER BY timestamp ASC LIMIT ?
          )
        `);
        stmt.run([toDelete]);
        stmt.free();
        logger.info(`Enforced max traces limit, deleted ${toDelete} old traces`);
        this.queueWrite(() => {}); // Trigger persist
      }
    }

    // Enforce retention days
    if (this.options.retentionDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.options.retentionDays);

      const stmt = this.db.prepare('DELETE FROM traces WHERE timestamp < ?');
      stmt.run([cutoffDate.toISOString()]);
      const changes = this.db.getRowsModified();
      stmt.free();

      if (changes > 0) {
        logger.info(`Enforced retention policy, deleted ${changes} old traces`);
        this.queueWrite(() => {}); // Trigger persist
      }
    }
  }

  /**
   * Export traces to JSON
   */
  exportToJSON(): string {
    return JSON.stringify(this.getAll(), null, 2);
  }

  /**
   * Import traces from JSON
   */
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

  /**
   * Close the database
   */
  async close(): Promise<void> {
    if (this.db) {
      if (this.writeQueue.length > 0 && !this.isProcessingQueue) {
        await this.processWriteQueue();
      }
      const maxWait = 2000;
      const start = Date.now();
      while (
        (this.writeQueue.length > 0 || this.isProcessingQueue) &&
        Date.now() - start < maxWait
      ) {
        await new Promise((r) => setTimeout(r, 50));
      }
      try {
        await this.persist();
      } catch (error) {
        logger.warn('Failed to persist journal during close, but continuing with cleanup:', error);
      }
      this.db.close();
      this.db = null;
      this.initialized = false;
      logger.info('Journal closed');
    }
  }

  // ===== Backward Compatibility Methods =====

  private getShadowFilePath(shadowId: string): string | null {
    const parsed = parseShadowId(shadowId);
    if (!parsed) return null;
    return join(this.options.projectPath, '.ornn', 'shadows', parsed.runtime, `${parsed.skillId}.md`);
  }

  private getSnapshotFilePath(shadowId: string, revision: number): string | null {
    const parsed = parseShadowId(shadowId);
    if (!parsed) return null;
    return join(
      this.options.projectPath,
      '.ornn',
      'snapshots',
      parsed.runtime,
      parsed.skillId,
      `rev-${String(revision).padStart(4, '0')}.md`
    );
  }

  private parseRevisionInput(revision: number | string): number | null {
    const parsed = typeof revision === 'number' ? revision : Number.parseInt(String(revision), 10);
    if (!Number.isInteger(parsed) || parsed < 0) return null;
    return parsed;
  }

  private schedulePersist(): void {
    try {
      this.persistSync();
    } catch (error) {
      logger.error('Failed to persist journal synchronously:', error);
      this.queueWrite(() => {});
    }
  }

  /**
   * Get record by revision
   */
  getRecordByRevision(shadowId: string, revision: number): JournalRecord | null {
    if (!this.db) return null;

    const stmt = this.db.prepare(
      `
        SELECT revision, timestamp, change_type, applied_by, reason, source_sessions
        FROM evolution_records
        WHERE shadow_id = ? AND revision = ?
        LIMIT 1
      `
    );
    stmt.bind([shadowId, revision]);

    if (!stmt.step()) {
      stmt.free();
      return null;
    }

    const row = stmt.getAsObject();
    stmt.free();

    return {
      revision: row.revision as number,
      timestamp: row.timestamp as string,
      change_type: row.change_type as string,
      applied_by: row.applied_by as string,
      reason: row.reason as string,
      source_sessions: JSON.parse((row.source_sessions as string) || '[]') as string[],
    };
  }

  /**
   * Get snapshots
   */
  getSnapshots(
    shadowId: string
  ): Array<{ revision: number; timestamp: string; file_path: string; content_hash: string }> {
    if (!this.db) return [];

    const stmt = this.db.prepare(
      `
        SELECT revision, timestamp, file_path, content_hash
        FROM snapshots
        WHERE shadow_id = ?
        ORDER BY revision ASC
      `
    );
    stmt.bind([shadowId]);

    const snapshots: Array<{
      revision: number;
      timestamp: string;
      file_path: string;
      content_hash: string;
    }> = [];

    while (stmt.step()) {
      const row = stmt.getAsObject();
      snapshots.push({
        revision: row.revision as number,
        timestamp: row.timestamp as string,
        file_path: row.file_path as string,
        content_hash: row.content_hash as string,
      });
    }
    stmt.free();

    return snapshots;
  }

  /**
   * Get journal records
   */
  getJournalRecords(
    shadowId: string,
    options?: { limit?: number; changeType?: string }
  ): JournalRecord[] {
    if (!this.db) return [];

    let sql = `
      SELECT revision, timestamp, change_type, applied_by, reason, source_sessions
      FROM evolution_records
      WHERE shadow_id = ?
    `;
    const params: Array<string | number> = [shadowId];

    if (options?.changeType) {
      sql += ' AND change_type = ?';
      params.push(options.changeType);
    }

    sql += ' ORDER BY revision DESC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const stmt = this.db.prepare(sql);
    stmt.bind(params);

    const records: JournalRecord[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      records.push({
        revision: row.revision as number,
        timestamp: row.timestamp as string,
        change_type: row.change_type as string,
        applied_by: row.applied_by as string,
        reason: row.reason as string,
        source_sessions: JSON.parse((row.source_sessions as string) || '[]') as string[],
      });
    }
    stmt.free();

    return records;
  }

  /**
   * Rollback
   */
  rollback(shadowId: string, revision: number): boolean {
    const snapshot = this.getSnapshots(shadowId).find((item) => item.revision === revision);
    if (!snapshot) return false;
    return this.rollbackToSnapshot(shadowId, snapshot.file_path);
  }

  /**
   * Rollback to snapshot
   */
  rollbackToSnapshot(shadowId: string, snapshotPath: string): boolean {
    const shadowPath = this.getShadowFilePath(shadowId);
    if (!shadowPath || !existsSync(snapshotPath)) return false;

    mkdirSync(dirname(shadowPath), { recursive: true });
    copyFileSync(snapshotPath, shadowPath);
    return true;
  }

  /**
   * Get latest revision
   */
  getLatestRevision(shadowId: string): number {
    if (!this.db) return 0;

    const stmt = this.db.prepare(
      'SELECT COALESCE(MAX(revision), 0) AS latest_revision FROM evolution_records WHERE shadow_id = ?'
    );
    stmt.bind([shadowId]);
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();

    return Number(row.latest_revision ?? 0);
  }

  /**
   * Create snapshot
   */
  createSnapshot(shadowId: string, revision: number | string): string {
    if (!this.db) return '';

    const normalizedRevision = this.parseRevisionInput(revision);
    const shadowPath = this.getShadowFilePath(shadowId);
    const snapshotPath =
      normalizedRevision === null ? null : this.getSnapshotFilePath(shadowId, normalizedRevision);
    if (normalizedRevision === null || !shadowPath || !snapshotPath || !existsSync(shadowPath)) {
      return '';
    }

    mkdirSync(dirname(snapshotPath), { recursive: true });
    const content = readFileSync(shadowPath, 'utf-8');
    writeFileSync(snapshotPath, content, 'utf-8');

    this.db.run(
      `
        INSERT OR REPLACE INTO snapshots (shadow_id, revision, timestamp, file_path, content_hash)
        VALUES (?, ?, ?, ?, ?)
      `,
      [shadowId, normalizedRevision, new Date().toISOString(), snapshotPath, hashString(content)]
    );
    this.schedulePersist();

    return snapshotPath;
  }

  /**
   * Record evolution
   */
  record(shadowId: string, data: unknown): void {
    if (!this.db) {
      logger.debug('Skipping journal record because database is not initialized', { shadowId });
      return;
    }

    const payload = (data ?? {}) as Record<string, unknown>;
    const revision = this.getLatestRevision(shadowId) + 1;
    const timestamp =
      typeof payload.timestamp === 'string' && payload.timestamp
        ? payload.timestamp
        : new Date().toISOString();
    const changeType =
      typeof payload.change_type === 'string' && payload.change_type
        ? payload.change_type
        : typeof payload.type === 'string' && payload.type
          ? payload.type
          : 'unknown';
    const appliedBy =
      payload.applied_by === 'manual' || payload.applied_by === 'auto'
        ? (payload.applied_by as string)
        : 'auto';
    const reason = typeof payload.reason === 'string' ? payload.reason : '';
    const sourceSessions = Array.isArray(payload.source_sessions)
      ? payload.source_sessions.filter((item): item is string => typeof item === 'string')
      : [];
    const patch = typeof payload.patch === 'string' ? payload.patch : null;
    const beforeHash = typeof payload.before_hash === 'string' ? payload.before_hash : null;
    const afterHash = typeof payload.after_hash === 'string' ? payload.after_hash : null;

    this.db.run(
      `
        INSERT OR REPLACE INTO evolution_records
        (shadow_id, revision, timestamp, change_type, applied_by, reason, source_sessions, patch, before_hash, after_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        shadowId,
        revision,
        timestamp,
        changeType,
        appliedBy,
        reason,
        JSON.stringify(sourceSessions),
        patch,
        beforeHash,
        afterHash,
      ]
    );
    this.schedulePersist();
  }
}

/**
 * Create a Journal instance
 */
export function createJournal(options: JournalOptions): Journal {
  return new Journal(options);
}

/**
 * Alias for createJournal for backward compatibility
 */
export function createJournalManager(projectPath: string): Journal {
  return createJournal({ projectPath });
}
