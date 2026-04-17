import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import { createChildLogger } from '../../utils/logger.js';
import type { JournalOptions } from './journal-types.js';

const logger = createChildLogger('journal-sqlite-store');

export type JournalSchemaInitializer = (db: Database) => void;

export function normalizeJournalOptions(options: JournalOptions): Required<JournalOptions> {
  return {
    maxTraces: 10000,
    retentionDays: 30,
    dbPath: join(options.projectPath, '.ornn', 'journal.db'),
    ...options,
  };
}

export class JournalSQLiteStore {
  private readonly options: Required<JournalOptions>;
  private SQL: SqlJsStatic | null = null;
  private db: Database | null = null;
  private initialized = false;
  private writeQueue: Array<() => void> = [];
  private isProcessingQueue = false;

  constructor(
    options: JournalOptions,
    private readonly initializeSchema: JournalSchemaInitializer
  ) {
    this.options = normalizeJournalOptions(options);
  }

  get settings(): Required<JournalOptions> {
    return this.options;
  }

  get database(): Database {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  getDatabase(): Database | null {
    return this.db;
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.SQL = await initSqlJs();

      const dbDir = dirname(this.options.dbPath);
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
      }

      if (existsSync(this.options.dbPath)) {
        this.db = new this.SQL.Database(readFileSync(this.options.dbPath));
        logger.debug('Loaded existing journal database', { path: this.options.dbPath });
      } else {
        this.db = new this.SQL.Database();
        logger.debug('Created new journal database', { path: this.options.dbPath });
      }

      this.initializeSchema(this.database);
      this.initialized = true;
      logger.debug('Journal sqlite store initialized');
    } catch (error) {
      logger.error('Failed to initialize journal sqlite store:', error);
      throw error;
    }
  }

  queueWrite(operation: () => void): void {
    this.writeQueue.push(operation);
    void this.processWriteQueue();
  }

  async flushWrites(): Promise<void> {
    if (this.writeQueue.length > 0 && !this.isProcessingQueue) {
      await this.processWriteQueue();
    }

    const maxWait = 2000;
    const start = Date.now();
    while (
      (this.writeQueue.length > 0 || this.isProcessingQueue) &&
      Date.now() - start < maxWait
    ) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  async close(): Promise<void> {
    if (!this.db) {
      return;
    }

    await this.flushWrites();

    try {
      await this.persist();
    } catch (error) {
      logger.warn('Failed to persist journal store during close, but continuing with cleanup:', error);
    }

    this.db.close();
    this.db = null;
    this.initialized = false;
    logger.info('Journal sqlite store closed');
  }

  persistSync(): void {
    if (!this.db) {
      return;
    }

    const data = this.db.export();
    mkdirSync(dirname(this.options.dbPath), { recursive: true });
    writeFileSync(this.options.dbPath, Buffer.from(data));
  }

  private async processWriteQueue(): Promise<void> {
    if (this.isProcessingQueue || this.writeQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      while (this.writeQueue.length > 0) {
        const operation = this.writeQueue.shift();
        if (operation) {
          operation();
        }
      }

      await this.persist();
    } catch (error) {
      logger.error('Error processing journal write queue:', error);
    } finally {
      this.isProcessingQueue = false;

      if (this.writeQueue.length > 0) {
        void this.processWriteQueue();
      }
    }
  }

  private async persist(): Promise<void> {
    if (!this.db) {
      return;
    }

    try {
      const data = this.db.export();
      await import('node:fs/promises').then((fs) =>
        fs.mkdir(dirname(this.options.dbPath), { recursive: true }).then(() =>
          fs.writeFile(this.options.dbPath, Buffer.from(data))
        )
      );
    } catch (error) {
      logger.error('Failed to persist journal store:', error);
      throw error;
    }
  }
}
