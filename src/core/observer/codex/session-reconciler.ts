export type ReconciliationWarnState = {
  lastWarnAt: number;
  suppressedWarnCount: number;
};

export function logReconciliationRecovery(options: {
  sessionId: string;
  path: string;
  previousOffset: number;
  currentSize: number;
  deltaBytes: number;
  reconciliationWarnState: Map<string, ReconciliationWarnState>;
  reconciliationWarnDeltaBytes: number;
  reconciliationWarnCooldownMs: number;
  now?: number;
  logDebug: (message: string, payload?: Record<string, unknown>) => void;
  logWarn: (message: string, payload?: Record<string, unknown>) => void;
}): void {
  const {
    sessionId,
    path,
    previousOffset,
    currentSize,
    deltaBytes,
    reconciliationWarnState,
    reconciliationWarnDeltaBytes,
    reconciliationWarnCooldownMs,
    logDebug,
    logWarn,
  } = options;

  if (deltaBytes <= reconciliationWarnDeltaBytes) {
    logDebug('Recovered missed session file growth during reconciliation', {
      sessionId,
      path,
      previousOffset,
      currentSize,
      deltaBytes,
    });
    return;
  }

  const now = options.now ?? Date.now();
  const previousWarn = reconciliationWarnState.get(path);
  if (previousWarn && now - previousWarn.lastWarnAt < reconciliationWarnCooldownMs) {
    previousWarn.suppressedWarnCount += 1;
    reconciliationWarnState.set(path, previousWarn);
    logDebug('Recovered missed session file growth during reconciliation', {
      sessionId,
      path,
      previousOffset,
      currentSize,
      deltaBytes,
      suppressedRepeatedWarning: true,
      suppressedWarnCount: previousWarn.suppressedWarnCount,
    });
    return;
  }

  reconciliationWarnState.set(path, {
    lastWarnAt: now,
    suppressedWarnCount: 0,
  });
  logWarn('Recovered missed session file growth during reconciliation', {
    sessionId,
    path,
    previousOffset,
    currentSize,
    deltaBytes,
    ...(previousWarn && previousWarn.suppressedWarnCount > 0
      ? { suppressedWarnCount: previousWarn.suppressedWarnCount }
      : {}),
  });
}

export function primeSessionOffsets(options: {
  sessionFiles: string[];
  processedByteOffset: Map<string, number>;
  getFileSize: (path: string) => number | null;
  logDebug?: (message: string, payload?: Record<string, unknown>) => void;
}): void {
  for (const path of options.sessionFiles) {
    if (options.processedByteOffset.has(path)) {
      continue;
    }

    try {
      const fileSize = options.getFileSize(path);
      if (fileSize !== null) {
        options.processedByteOffset.set(path, fileSize);
      }
    } catch {
      // ignore files that disappear during startup scan
    }
  }

  options.logDebug?.('Primed session offsets for Codex observer', {
    sessionFileCount: options.sessionFiles.length,
  });
}

export function listRecentSessionFiles(options: {
  limit: number;
  sessionFiles: string[];
  getModifiedTimeMs: (path: string) => number | null;
}): string[] {
  return options.sessionFiles
    .map((path) => {
      const mtimeMs = options.getModifiedTimeMs(path);
      return mtimeMs === null ? null : { path, mtimeMs };
    })
    .filter((item): item is { path: string; mtimeMs: number } => item !== null)
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, Math.max(options.limit, 0))
    .map((item) => item.path);
}

export function bootstrapRecentSessionFiles(options: {
  limit: number;
  processedFiles: Set<string>;
  bootstrapTailLineLimit: number;
  listRecentSessionFiles: (limit: number) => string[];
  processSessionFileInternal: (path: string, options?: { bootstrapTailLines?: number }) => void;
}): void {
  const candidates = options.listRecentSessionFiles(options.limit);
  for (const path of candidates) {
    if (options.processedFiles.has(path)) {
      continue;
    }
    options.processedFiles.add(path);
    options.processSessionFileInternal(path, {
      bootstrapTailLines: options.bootstrapTailLineLimit,
    });
  }
}

export function reconcileRecentSessionGrowth(options: {
  limit: number;
  processedFiles: Set<string>;
  processedByteOffset: Map<string, number>;
  reconciliationWarnState: Map<string, ReconciliationWarnState>;
  reconciliationWarnDeltaBytes: number;
  reconciliationWarnCooldownMs: number;
  listRecentSessionFiles: (limit: number) => string[];
  getFileSize: (path: string) => number | null;
  extractSessionId: (path: string) => string;
  processSessionFileInternal: (path: string, options?: { bootstrapTailLines?: number }) => void;
  logInfo: (message: string, payload?: Record<string, unknown>) => void;
  logDebug: (message: string, payload?: Record<string, unknown>) => void;
  logWarn: (message: string, payload?: Record<string, unknown>) => void;
}): void {
  const candidates = options.listRecentSessionFiles(options.limit);
  for (const path of candidates) {
    const currentSize = options.getFileSize(path);
    if (currentSize === null) {
      continue;
    }

    const previousOffset = options.processedByteOffset.get(path);
    const sessionId = options.extractSessionId(path);

    if (!options.processedFiles.has(path)) {
      options.processedFiles.add(path);
      if (currentSize > 0) {
        options.logInfo('Recovered unseen recent session file during reconciliation', {
          sessionId,
          path,
          currentSize,
        });
        options.processSessionFileInternal(path);
      }
      continue;
    }

    if (previousOffset === undefined || currentSize !== previousOffset) {
      const deltaBytes =
        previousOffset === undefined ? currentSize : Math.max(currentSize - previousOffset, 0);
      logReconciliationRecovery({
        sessionId,
        path,
        previousOffset: previousOffset ?? 0,
        currentSize,
        deltaBytes,
        reconciliationWarnState: options.reconciliationWarnState,
        reconciliationWarnDeltaBytes: options.reconciliationWarnDeltaBytes,
        reconciliationWarnCooldownMs: options.reconciliationWarnCooldownMs,
        logDebug: options.logDebug,
        logWarn: options.logWarn,
      });
      options.processSessionFileInternal(path);
    }
  }
}
