/**
 * SQLite Journal
 *
 * 负责 Trace 的持久化存储，使用 SQLite 数据库。
 * 提供高性能的 Trace 存储、查询和索引功能。
 */

import { JournalSQLiteStore, type JournalSchemaInitializer } from './journal-sqlite-store.js';
import { createShadowHistoryTables, ShadowHistoryJournal } from './shadow-history.js';
import { createTraceJournalTables, TraceJournal } from './trace-journal.js';
import type { Trace } from '../../types/index.js';
import type { JournalOptions } from './journal-types.js';

export type { JournalRecord, JournalOptions, TraceQuery, TraceStats } from './journal-types.js';

type ShadowRecordInput = Parameters<ShadowHistoryJournal['record']>[1];
type JournalRecordQuery = Parameters<ShadowHistoryJournal['getJournalRecords']>[1];

const initializeJournalSchema: JournalSchemaInitializer = (db) => {
  createTraceJournalTables(db);
  createShadowHistoryTables(db);
};

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
  private readonly sqliteStore: JournalSQLiteStore;
  private readonly traceJournal: TraceJournal;
  private readonly shadowHistory: ShadowHistoryJournal;

  constructor(options: JournalOptions) {
    this.sqliteStore = new JournalSQLiteStore(options, initializeJournalSchema);
    this.traceJournal = new TraceJournal(this.sqliteStore);
    this.shadowHistory = new ShadowHistoryJournal(this.sqliteStore);
  }

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    await this.sqliteStore.init();
  }

  /**
   * Store a trace
   */
  store(trace: Trace): void {
    this.traceJournal.store(trace);
  }

  /**
   * Store multiple traces
   */
  storeBatch(traces: Trace[]): void {
    this.traceJournal.storeBatch(traces);
  }

  /**
   * Get a trace by ID
   */
  get(traceId: string): Trace | undefined {
    return this.traceJournal.get(traceId);
  }

  /**
   * Query traces
   */
  query(...args: Parameters<TraceJournal['query']>): ReturnType<TraceJournal['query']> {
    return this.traceJournal.query(...args);
  }

  /**
   * Get traces by session ID
   */
  getBySession(sessionId: string): Trace[] {
    return this.traceJournal.getBySession(sessionId);
  }

  /**
   * Get traces by skill ID
   */
  getBySkill(skillId: string): Trace[] {
    return this.traceJournal.getBySkill(skillId);
  }

  /**
   * Get all traces
   */
  getAll(): Trace[] {
    return this.traceJournal.getAll();
  }

  /**
   * Get unique session IDs
   */
  getSessionIds(): string[] {
    return this.traceJournal.getSessionIds();
  }

  /**
   * Get unique skill IDs
   */
  getSkillIds(): string[] {
    return this.traceJournal.getSkillIds();
  }

  /**
   * Delete a trace
   */
  delete(traceId: string): boolean {
    return this.traceJournal.delete(traceId);
  }

  /**
   * Clear all traces
   */
  clear(): void {
    this.traceJournal.clear();
  }

  /**
   * Get store statistics
   */
  getStats(): ReturnType<TraceJournal['getStats']> {
    return this.traceJournal.getStats();
  }

  /**
   * Get count of traces
   */
  count(): number {
    return this.traceJournal.count();
  }

  /**
   * Export traces to JSON
   */
  exportToJSON(): string {
    return this.traceJournal.exportToJSON();
  }

  /**
   * Import traces from JSON
   */
  importFromJSON(json: string): void {
    this.traceJournal.importFromJSON(json);
  }

  /**
   * Close the database
   */
  async close(): Promise<void> {
    await this.sqliteStore.close();
  }

  getRecordByRevision(shadowId: string, revision: number) {
    return this.shadowHistory.getRecordByRevision(shadowId, revision);
  }

  getSnapshots(shadowId: string) {
    return this.shadowHistory.getSnapshots(shadowId);
  }

  getJournalRecords(shadowId: string, options?: JournalRecordQuery) {
    return this.shadowHistory.getJournalRecords(shadowId, options);
  }

  rollback(shadowId: string, revision: number): boolean {
    return this.shadowHistory.rollback(shadowId, revision);
  }

  rollbackToSnapshot(shadowId: string, snapshotPath: string): boolean {
    return this.shadowHistory.rollbackToSnapshot(shadowId, snapshotPath);
  }

  getLatestRevision(shadowId: string): number {
    return this.shadowHistory.getLatestRevision(shadowId);
  }

  createSnapshot(shadowId: string, revision: number | string): string {
    return this.shadowHistory.createSnapshot(shadowId, revision);
  }

  record(shadowId: string, data: ShadowRecordInput): void {
    this.shadowHistory.record(shadowId, data);
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
