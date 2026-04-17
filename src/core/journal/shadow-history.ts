import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Database } from 'sql.js';
import { hashString } from '../../utils/hash.js';
import { createChildLogger } from '../../utils/logger.js';
import { parseShadowId } from '../../utils/parse.js';
import type { JournalRecord } from './journal-types.js';
import { JournalSQLiteStore } from './journal-sqlite-store.js';

const logger = createChildLogger('shadow-history');

export function createShadowHistoryTables(db: Database): void {
  db.exec(`
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

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_evolution_records_shadow
    ON evolution_records(shadow_id, revision DESC);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      shadow_id TEXT NOT NULL,
      revision INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      file_path TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      PRIMARY KEY (shadow_id, revision)
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_snapshots_shadow
    ON snapshots(shadow_id, revision ASC);
  `);
}

export class ShadowHistoryJournal {
  constructor(private readonly store: JournalSQLiteStore) {}

  getRecordByRevision(shadowId: string, revision: number): JournalRecord | null {
    const db = this.store.getDatabase();
    if (!db) {
      return null;
    }

    const stmt = db.prepare(`
      SELECT revision, timestamp, change_type, applied_by, reason, source_sessions
      FROM evolution_records
      WHERE shadow_id = ? AND revision = ?
      LIMIT 1
    `);
    stmt.bind([shadowId, revision]);

    if (!stmt.step()) {
      stmt.free();
      return null;
    }

    const record = this.mapJournalRecord(stmt.getAsObject() as Record<string, unknown>);
    stmt.free();
    return record;
  }

  getSnapshots(
    shadowId: string
  ): Array<{ revision: number; timestamp: string; file_path: string; content_hash: string }> {
    const db = this.store.getDatabase();
    if (!db) {
      return [];
    }

    const stmt = db.prepare(`
      SELECT revision, timestamp, file_path, content_hash
      FROM snapshots
      WHERE shadow_id = ?
      ORDER BY revision ASC
    `);
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

  getJournalRecords(
    shadowId: string,
    options?: { limit?: number; changeType?: string }
  ): JournalRecord[] {
    const db = this.store.getDatabase();
    if (!db) {
      return [];
    }

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

    const stmt = db.prepare(sql);
    stmt.bind(params);

    const records: JournalRecord[] = [];
    while (stmt.step()) {
      records.push(this.mapJournalRecord(stmt.getAsObject() as Record<string, unknown>));
    }
    stmt.free();
    return records;
  }

  rollback(shadowId: string, revision: number): boolean {
    const snapshot = this.getSnapshots(shadowId).find((item) => item.revision === revision);
    if (!snapshot) {
      return false;
    }
    return this.rollbackToSnapshot(shadowId, snapshot.file_path);
  }

  rollbackToSnapshot(shadowId: string, snapshotPath: string): boolean {
    const shadowPath = this.getShadowFilePath(shadowId);
    if (!shadowPath || !existsSync(snapshotPath)) {
      return false;
    }

    mkdirSync(dirname(shadowPath), { recursive: true });
    copyFileSync(snapshotPath, shadowPath);
    return true;
  }

  getLatestRevision(shadowId: string): number {
    const db = this.store.getDatabase();
    if (!db) {
      return 0;
    }

    const stmt = db.prepare(
      'SELECT COALESCE(MAX(revision), 0) AS latest_revision FROM evolution_records WHERE shadow_id = ?'
    );
    stmt.bind([shadowId]);
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();
    return Number(row.latest_revision ?? 0);
  }

  createSnapshot(shadowId: string, revision: number | string): string {
    const db = this.store.getDatabase();
    if (!db) {
      return '';
    }

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

    db.run(
      `
        INSERT OR REPLACE INTO snapshots (shadow_id, revision, timestamp, file_path, content_hash)
        VALUES (?, ?, ?, ?, ?)
      `,
      [shadowId, normalizedRevision, new Date().toISOString(), snapshotPath, hashString(content)]
    );
    this.persistImmediately();

    return snapshotPath;
  }

  record(shadowId: string, data: unknown): void {
    const db = this.store.getDatabase();
    if (!db) {
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

    db.run(
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
    this.persistImmediately();
  }

  private mapJournalRecord(row: Record<string, unknown>): JournalRecord {
    return {
      revision: row.revision as number,
      timestamp: row.timestamp as string,
      change_type: row.change_type as string,
      applied_by: row.applied_by as string,
      reason: row.reason as string,
      source_sessions: JSON.parse((row.source_sessions as string) || '[]') as string[],
    };
  }

  private getShadowFilePath(shadowId: string): string | null {
    const parsed = parseShadowId(shadowId);
    if (!parsed) {
      return null;
    }

    return join(this.store.settings.projectPath, '.ornn', 'shadows', parsed.runtime, `${parsed.skillId}.md`);
  }

  private getSnapshotFilePath(shadowId: string, revision: number): string | null {
    const parsed = parseShadowId(shadowId);
    if (!parsed) {
      return null;
    }

    return join(
      this.store.settings.projectPath,
      '.ornn',
      'snapshots',
      parsed.runtime,
      parsed.skillId,
      `rev-${String(revision).padStart(4, '0')}.md`
    );
  }

  private parseRevisionInput(revision: number | string): number | null {
    const parsed =
      typeof revision === 'number' ? revision : Number.parseInt(String(revision), 10);

    if (!Number.isInteger(parsed) || parsed < 0) {
      return null;
    }

    return parsed;
  }

  private persistImmediately(): void {
    try {
      this.store.persistSync();
    } catch (error) {
      logger.error('Failed to persist journal synchronously:', error);
      this.store.queueWrite(() => {});
    }
  }
}
