import { resolve } from 'node:path';
import { SQLiteDbAdapter } from './sqlite/sqlite-db-adapter.js';
import { SQLiteOriginSkillRepo } from './sqlite/sqlite-origin-skill-repo.js';
import { createSQLiteStorageTables } from './sqlite/sqlite-schema.js';
import { SQLiteSessionRepo } from './sqlite/sqlite-session-repo.js';
import { SQLiteShadowSkillRepo } from './sqlite/sqlite-shadow-skill-repo.js';
import { SQLiteTraceSkillMappingRepo } from './sqlite/sqlite-trace-skill-mapping-repo.js';
import type { OriginSkill, ProjectSkillShadow, Session, ShadowStatus } from '../types/index.js';

type EvolutionRecordIndex = Parameters<SQLiteShadowSkillRepo['addEvolutionRecordIndex']>[0];
type SnapshotRecord = Parameters<SQLiteShadowSkillRepo['addSnapshot']>[0];
type TraceIndexRecord = Parameters<SQLiteSessionRepo['addTraceIndex']>[0];
type TraceSkillMappingRecord = Parameters<SQLiteTraceSkillMappingRepo['upsertTraceSkillMapping']>[0];

/**
 * SQLite 存储管理器
 */
export class SQLiteStorage {
  private readonly adapter: SQLiteDbAdapter;
  private readonly shadowSkillRepo: SQLiteShadowSkillRepo;
  private readonly sessionRepo: SQLiteSessionRepo;
  private readonly originSkillRepo: SQLiteOriginSkillRepo;
  private readonly traceSkillMappingRepo: SQLiteTraceSkillMappingRepo;

  // 单例管理：防止多个实例指向同一文件
  private static instances: Map<string, SQLiteStorage> = new Map();
  private static locks: Map<string, Promise<SQLiteStorage>> = new Map();

  private constructor(dbPath: string) {
    this.adapter = new SQLiteDbAdapter(dbPath, createSQLiteStorageTables);
    this.shadowSkillRepo = new SQLiteShadowSkillRepo(this.adapter);
    this.sessionRepo = new SQLiteSessionRepo(this.adapter);
    this.originSkillRepo = new SQLiteOriginSkillRepo(this.adapter);
    this.traceSkillMappingRepo = new SQLiteTraceSkillMappingRepo(this.adapter);
  }

  /**
   * 获取 SQLiteStorage 实例（单例模式）
   * 使用异步锁防止并发创建多个实例
   */
  static async getInstance(dbPath: string): Promise<SQLiteStorage> {
    const normalizedPath = resolve(dbPath);

    if (SQLiteStorage.instances.has(normalizedPath)) {
      return SQLiteStorage.instances.get(normalizedPath)!;
    }

    if (SQLiteStorage.locks.has(normalizedPath)) {
      return SQLiteStorage.locks.get(normalizedPath)!;
    }

    const createPromise = Promise.resolve().then(() => {
      try {
        const instance = new SQLiteStorage(normalizedPath);
        SQLiteStorage.instances.set(normalizedPath, instance);
        return instance;
      } finally {
        SQLiteStorage.locks.delete(normalizedPath);
      }
    });

    SQLiteStorage.locks.set(normalizedPath, createPromise);
    return createPromise;
  }

  /**
   * 关闭并移除实例
   */
  static removeInstance(dbPath: string): void {
    const instance = SQLiteStorage.instances.get(dbPath);
    if (!instance) {
      return;
    }

    instance.close();
    SQLiteStorage.instances.delete(dbPath);
  }

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    await this.adapter.init();
  }

  /**
   * 开始事务
   */
  beginTrans(): void {
    this.adapter.beginTransaction();
  }

  /**
   * 提交事务
   */
  commit(): void {
    this.adapter.commit();
  }

  /**
   * 回滚事务
   */
  rollback(): void {
    this.adapter.rollback();
  }

  /**
   * 创建数据库备份
   */
  createBackup(backupPath?: string): string {
    return this.adapter.createBackup(backupPath);
  }

  /**
   * 从备份恢复数据库
   */
  async restoreFromBackup(backupPath: string): Promise<void> {
    await this.adapter.restoreFromBackup(backupPath);
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    this.adapter.close();
  }

  upsertShadowSkill(shadow: ProjectSkillShadow): void {
    this.shadowSkillRepo.upsertShadowSkill(shadow);
  }

  upsertShadowSkillInTransaction(shadow: ProjectSkillShadow): void {
    this.shadowSkillRepo.upsertShadowSkillInTransaction(shadow);
  }

  batchOperation<T>(operations: () => T): T {
    if (!this.adapter.getDatabase()) {
      throw new Error('Database not initialized');
    }
    this.beginTrans();

    try {
      const result = operations();
      this.commit();
      return result;
    } catch (error) {
      this.rollback();
      throw error;
    }
  }

  getShadowSkill(projectId: string, skillId: string) {
    return this.shadowSkillRepo.getShadowSkill(projectId, skillId);
  }

  listShadowSkills(projectId: string) {
    return this.shadowSkillRepo.listShadowSkills(projectId);
  }

  updateShadowStatus(shadowId: string, status: ShadowStatus): void {
    this.shadowSkillRepo.updateShadowStatus(shadowId, status);
  }

  updateShadowRevision(shadowId: string, revision: number): void {
    this.shadowSkillRepo.updateShadowRevision(shadowId, revision);
  }

  addEvolutionRecordIndex(record: EvolutionRecordIndex): void {
    this.shadowSkillRepo.addEvolutionRecordIndex(record);
  }

  getEvolutionRecordIndex(shadowId: string, limit = 50) {
    return this.shadowSkillRepo.getEvolutionRecordIndex(shadowId, limit);
  }

  addSnapshot(snapshot: SnapshotRecord): void {
    this.shadowSkillRepo.addSnapshot(snapshot);
  }

  getSnapshots(shadowId: string) {
    return this.shadowSkillRepo.getSnapshots(shadowId);
  }

  getLatestSnapshot(shadowId: string) {
    return this.shadowSkillRepo.getLatestSnapshot(shadowId);
  }

  createSession(session: Session): void {
    this.sessionRepo.createSession(session);
  }

  getSession(sessionId: string) {
    return this.sessionRepo.getSession(sessionId);
  }

  incrementSessionTraceCount(sessionId: string): void {
    this.sessionRepo.incrementSessionTraceCount(sessionId);
  }

  addTraceIndex(trace: TraceIndexRecord): void {
    this.sessionRepo.addTraceIndex(trace);
  }

  getTraceIndexBySession(sessionId: string, limit = 100) {
    return this.sessionRepo.getTraceIndexBySession(sessionId, limit);
  }

  upsertOriginSkill(origin: OriginSkill): void {
    this.originSkillRepo.upsertOriginSkill(origin);
  }

  getOriginSkill(skillId: string) {
    return this.originSkillRepo.getOriginSkill(skillId);
  }

  listOriginSkills() {
    return this.originSkillRepo.listOriginSkills();
  }

  upsertTraceSkillMapping(mapping: TraceSkillMappingRecord): void {
    this.traceSkillMappingRepo.upsertTraceSkillMapping(mapping);
  }

  getTraceSkillMappings(skillId: string) {
    return this.traceSkillMappingRepo.getTraceSkillMappings(skillId);
  }

  getTraceSkillMappingByTraceId(traceId: string) {
    return this.traceSkillMappingRepo.getTraceSkillMappingByTraceId(traceId);
  }

  getTraceSkillMappingStats() {
    return this.traceSkillMappingRepo.getTraceSkillMappingStats();
  }

  cleanupTraceSkillMappings(retentionDays: number): number {
    return this.traceSkillMappingRepo.cleanupTraceSkillMappings(retentionDays);
  }
}

// 导出工厂函数（使用单例模式）
export async function createSQLiteStorage(dbPath: string): Promise<SQLiteStorage> {
  return SQLiteStorage.getInstance(dbPath);
}
