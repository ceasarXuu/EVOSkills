import { watch, type FSWatcher } from 'chokidar';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BaseObserver } from './base-observer.js';
import { createChildLogger } from '../../utils/logger.js';
import {
  collectSessionFiles,
  extractSessionIdFromPath,
  getFileSize as getSessionFileSize,
  readSessionLinesSinceOffset as readSessionLinesSinceOffsetFromFile,
  readSessionTailLines as readSessionTailLinesFromFile,
} from './codex/session-file-reader.js';
import {
  CodexEventPreprocessor,
  type CodexRawEvent,
} from './codex/event-preprocessor.js';
import {
  bootstrapRecentSessionFiles as bootstrapRecentFiles,
  listRecentSessionFiles as listRecentFiles,
  logReconciliationRecovery as logRecoveredGrowth,
  primeSessionOffsets as primeOffsets,
  reconcileRecentSessionGrowth as reconcileSessionGrowth,
  type ReconciliationWarnState,
} from './codex/session-reconciler.js';
import { emitCodexPreprocessedTraces } from './codex/trace-emitter.js';
import type { PreprocessedTrace, Trace } from '../../types/index.js';

const logger = createChildLogger('codex-observer');

/**
 * Codex Observer
 *
 * 监听 Codex 的活跃会话日志文件（~/.codex/sessions/YYYY/MM/DD/*.jsonl）
 * 基于真实 Codex trace 结构实现
 */
export class CodexObserver extends BaseObserver {
  private watcher: FSWatcher | null = null;
  private reconciliationTimer: NodeJS.Timeout | null = null;
  private sessionsDir: string;
  private readonly sessionIndexPath: string;
  private currentSessionId: string | null = null;
  private turnCounter = 0;
  private processedFiles: Set<string> = new Set();
  private processedByteOffset: Map<string, number> = new Map();
  private pendingLineFragment: Map<string, string> = new Map();
  private sessionProjectPaths: Map<string, string> = new Map();
  private reconciliationWarnState: Map<string, ReconciliationWarnState> = new Map();
  private readonly bootstrapFileLimit = 1;
  private readonly bootstrapTailLineLimit = 10;
  private readonly reconciliationFileLimit = 3;
  private readonly reconciliationIntervalMs = 3000;
  private readonly reconciliationWarnDeltaBytes = 65536;
  private readonly reconciliationWarnCooldownMs = 60000;
  private readonly readChunkSize = 65536;
  private readonly eventPreprocessor: CodexEventPreprocessor;

  constructor(sessionsDir?: string) {
    super('codex');
    this.sessionsDir = sessionsDir ?? this.getDefaultSessionsDir();
    this.sessionIndexPath = join(this.getCodexHome(), 'session_index.jsonl');
    this.eventPreprocessor = new CodexEventPreprocessor({
      sessionProjectPaths: this.sessionProjectPaths,
      getNextTurnId: () => this.getNextTurnIdSync(),
    });
  }

  private getCodexHome(): string {
    return join(process.env.HOME ?? process.env.USERPROFILE ?? '', '.codex');
  }

  private getDefaultSessionsDir(): string {
    return join(this.getCodexHome(), 'sessions');
  }

  start(): void {
    if (this.isRunning) {
      logger.warn('Observer already running');
      return;
    }

    if (!existsSync(this.sessionsDir)) {
      logger.warn(`Sessions directory not found: ${this.sessionsDir}`);
      return;
    }

    this.isRunning = true;
    logger.debug('Starting Codex observer', { sessionsDir: this.sessionsDir });

    const watchPattern = join(this.sessionsDir, '**', '*.jsonl');
    this.watcher = watch(watchPattern, {
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher.on('add', (path) => this.handleFileAdd(path));
    this.watcher.on('change', (path) => this.handleFileChange(path));
    this.watcher.on('unlink', (path) => this.handleFileUnlink(path));

    this.primeSessionOffsets();
    this.bootstrapRecentSessionFiles(this.bootstrapFileLimit);
    this.startReconciliationLoop();

    logger.debug('Codex observer started', { watchPattern });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    if (this.reconciliationTimer) {
      clearInterval(this.reconciliationTimer);
      this.reconciliationTimer = null;
    }

    this.processedFiles.clear();
    this.processedByteOffset.clear();
    this.pendingLineFragment.clear();
    this.sessionProjectPaths.clear();
    this.reconciliationWarnState.clear();
    logger.info('Codex observer stopped');
  }

  private handleFileAdd(path: string): void {
    if (!path.endsWith('.jsonl')) {
      return;
    }

    const currentSize = this.getFileSize(path);
    const previousOffset = this.processedByteOffset.get(path) ?? 0;
    const sessionId = this.extractSessionId(path);

    if (this.processedFiles.has(path)) {
      if (currentSize !== null && currentSize !== previousOffset) {
        logger.warn('Recovering session file growth from repeated add event', {
          sessionId,
          path,
          previousOffset,
          currentSize,
        });
        this.processSessionFileInternal(path);
      }
      return;
    }

    this.processedFiles.add(path);
    this.currentSessionId = sessionId;
    logger.debug(`New session detected: ${sessionId}`, { path });
    this.processSessionFileInternal(path);
  }

  private handleFileChange(path: string): void {
    if (!path.endsWith('.jsonl')) {
      return;
    }

    const sessionId = this.extractSessionId(path);
    logger.debug(`Session file changed: ${sessionId}`, { path });
    this.processSessionFileInternal(path);
  }

  private handleFileUnlink(path: string): void {
    this.processedFiles.delete(path);
    this.processedByteOffset.delete(path);
    this.pendingLineFragment.delete(path);
    this.reconciliationWarnState.delete(path);
    logger.debug('Session file removed from observer tracking', { path });
  }

  logReconciliationRecovery(
    sessionId: string,
    path: string,
    previousOffset: number,
    currentSize: number,
    deltaBytes: number
  ): void {
    logRecoveredGrowth({
      sessionId,
      path,
      previousOffset,
      currentSize,
      deltaBytes,
      reconciliationWarnState: this.reconciliationWarnState,
      reconciliationWarnDeltaBytes: this.reconciliationWarnDeltaBytes,
      reconciliationWarnCooldownMs: this.reconciliationWarnCooldownMs,
      logDebug: (message, payload) => logger.debug(message, payload),
      logWarn: (message, payload) => logger.warn(message, payload),
    });
  }

  private bootstrapRecentSessionFiles(limit: number): void {
    bootstrapRecentFiles({
      limit,
      processedFiles: this.processedFiles,
      bootstrapTailLineLimit: this.bootstrapTailLineLimit,
      listRecentSessionFiles: (nextLimit) => this.listRecentSessionFiles(nextLimit),
      processSessionFileInternal: (path, options) => this.processSessionFileInternal(path, options),
    });
  }

  private primeSessionOffsets(): void {
    primeOffsets({
      sessionFiles: this.collectSessionFiles(this.sessionsDir),
      processedByteOffset: this.processedByteOffset,
      getFileSize: (path) => this.getFileSize(path),
      logDebug: (message, payload) => logger.debug(message, payload),
    });
  }

  private startReconciliationLoop(): void {
    if (this.reconciliationTimer) {
      clearInterval(this.reconciliationTimer);
    }

    this.reconciliationTimer = setInterval(() => {
      this.reconcileRecentSessionGrowth(this.reconciliationFileLimit);
    }, this.reconciliationIntervalMs);
  }

  private reconcileRecentSessionGrowth(limit = this.reconciliationFileLimit): void {
    reconcileSessionGrowth({
      limit,
      processedFiles: this.processedFiles,
      processedByteOffset: this.processedByteOffset,
      reconciliationWarnState: this.reconciliationWarnState,
      reconciliationWarnDeltaBytes: this.reconciliationWarnDeltaBytes,
      reconciliationWarnCooldownMs: this.reconciliationWarnCooldownMs,
      listRecentSessionFiles: (nextLimit) => this.listRecentSessionFiles(nextLimit),
      getFileSize: (path) => this.getFileSize(path),
      extractSessionId: (path) => this.extractSessionId(path),
      processSessionFileInternal: (path, options) => this.processSessionFileInternal(path, options),
      logInfo: (message, payload) => logger.info(message, payload),
      logDebug: (message, payload) => logger.debug(message, payload),
      logWarn: (message, payload) => logger.warn(message, payload),
    });
  }

  private listRecentSessionFiles(limit: number): string[] {
    return listRecentFiles({
      limit,
      sessionFiles: this.collectSessionFiles(this.sessionsDir),
      getModifiedTimeMs: (path) => {
        try {
          return statSync(path).mtimeMs;
        } catch {
          return null;
        }
      },
    });
  }

  private getFileSize(path: string): number | null {
    return getSessionFileSize(path);
  }

  private collectSessionFiles(dir: string): string[] {
    return collectSessionFiles(dir, {
      logDebug: (message, payload) => logger.debug(message, payload),
    });
  }

  private processSessionFileInternal(
    path: string,
    options?: { bootstrapTailLines?: number }
  ): void {
    const sessionId = this.extractSessionId(path);
    const traces: PreprocessedTrace[] = [];

    try {
      const bootstrapTailLines = options?.bootstrapTailLines ?? 0;
      const previousOffset = this.processedByteOffset.get(path) ?? 0;
      const { lines: newLines, nextOffset } =
        bootstrapTailLines > 0
          ? this.readSessionTailLines(path, bootstrapTailLines)
          : this.readSessionLinesSinceOffset(path);

      for (const line of newLines) {
        const rawType = this.peekRawEventType(line);
        if (rawType === 'compacted' || rawType === 'event_msg') {
          continue;
        }

        try {
          const event = JSON.parse(line) as CodexRawEvent;
          this.captureSessionProjectPath(sessionId, event);
          if (event.type === 'turn_context') {
            continue;
          }

          const preprocessed = this.preprocessEvent(sessionId, event);
          if (preprocessed) {
            traces.push(preprocessed);
          }
        } catch (parseError) {
          logger.debug('Skipping malformed NDJSON line', { sessionId, error: parseError });
        }
      }

      if (traces.length > 0) {
        this.emitPreprocessedTraces(sessionId, traces);
      }

      this.processedByteOffset.set(path, nextOffset);
      logger.debug(`Processed ${traces.length} incremental traces from session ${sessionId}`, {
        nextOffset,
        previousOffset,
        bytesRead: Math.max(nextOffset - previousOffset, 0),
        newLines: newLines.length,
        bootstrapTailLines,
        readMode: bootstrapTailLines > 0 ? 'bootstrap_tail' : 'incremental_offset',
      });
    } catch (error) {
      logger.warn(`Failed to read session file: ${path}`, { error });
    }
  }

  private readSessionLinesSinceOffset(path: string): { lines: string[]; nextOffset: number } {
    return readSessionLinesSinceOffsetFromFile({
      path,
      processedByteOffset: this.processedByteOffset,
      pendingLineFragment: this.pendingLineFragment,
      extractSessionId: (targetPath) => this.extractSessionId(targetPath),
      logDebug: (message, payload) => logger.debug(message, payload),
    });
  }

  private readSessionTailLines(path: string, maxLines: number): { lines: string[]; nextOffset: number } {
    return readSessionTailLinesFromFile({
      path,
      maxLines,
      readChunkSize: this.readChunkSize,
    });
  }

  private preprocessEvent(sessionId: string, event: CodexRawEvent): PreprocessedTrace | null {
    return this.eventPreprocessor.preprocessEvent(sessionId, event);
  }

  preprocessResponseItem(
    sessionId: string,
    turnId: string,
    event: CodexRawEvent
  ): PreprocessedTrace | null {
    return this.eventPreprocessor.preprocessResponseItem(sessionId, turnId, event);
  }

  private peekRawEventType(line: string): string | null {
    return this.eventPreprocessor.peekRawEventType(line);
  }

  private emitPreprocessedTraces(sessionId: string, traces: PreprocessedTrace[]): void {
    emitCodexPreprocessedTraces({
      sessionId,
      traces,
      convertToStandardTrace: (trace) => this.convertToStandardTrace(trace),
      emitTrace: (trace) => this.emitTrace(trace),
      logInfo: (message, payload) => logger.info(message, payload),
      logDebug: (message, payload) => logger.debug(message, payload),
    });
  }

  private convertToStandardTrace(preprocessed: PreprocessedTrace): Trace {
    return this.eventPreprocessor.convertToStandardTrace(preprocessed);
  }

  private getNextTurnIdSync(): string {
    this.turnCounter += 1;
    return `turn_${this.turnCounter}`;
  }

  private extractSessionId(path: string): string {
    return extractSessionIdFromPath(path);
  }

  processSessionFile(filePath: string): void {
    if (!existsSync(filePath)) {
      throw new Error(`Session file not found: ${filePath}`);
    }

    logger.info(`Processing session file: ${filePath}`);
    this.processSessionFileInternal(filePath);
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  setSessionsDir(dir: string): void {
    this.sessionsDir = dir;
  }

  getSessionsDir(): string {
    return this.sessionsDir;
  }

  readSessionIndex(): Array<{ id: string; thread_name: string; updated_at: string }> {
    if (!existsSync(this.sessionIndexPath)) {
      return [];
    }

    try {
      const content = readFileSync(this.sessionIndexPath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      return lines
        .map((line): { id: string; thread_name: string; updated_at: string } | null => {
          try {
            return JSON.parse(line) as { id: string; thread_name: string; updated_at: string };
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Array<{ id: string; thread_name: string; updated_at: string }>;
    } catch (error) {
      logger.warn('Failed to read session index', { error });
      return [];
    }
  }

  private captureSessionProjectPath(sessionId: string, event: CodexRawEvent): void {
    this.eventPreprocessor.captureSessionProjectPath(sessionId, event);
  }
}

export function createCodexObserver(sessionsDir?: string): CodexObserver {
  return new CodexObserver(sessionsDir);
}
