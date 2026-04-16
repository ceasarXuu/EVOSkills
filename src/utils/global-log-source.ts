import { basename, dirname, join } from 'node:path';
import { existsSync, readdirSync, statSync, openSync, readSync, closeSync } from 'node:fs';

export interface GlobalLogEntry {
  raw: string;
  level: string;
  timestamp: string;
  context: string;
  message: string;
}

export interface RotatingLogCursor {
  path: string | null;
  offset: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tailTextFile(filePath: string, maxLines = 200): string[] {
  if (!existsSync(filePath)) return [];

  const CHUNK_SIZE = 65536;
  const fd = openSync(filePath, 'r');
  try {
    const fileSize = statSync(filePath).size;
    if (fileSize === 0) return [];

    let position = fileSize;
    let lines: string[] = [];
    let remainder = '';

    while (position > 0 && lines.length < maxLines) {
      const readSize = Math.min(CHUNK_SIZE, position);
      position -= readSize;
      const buffer = Buffer.alloc(readSize);
      readSync(fd, buffer, 0, readSize, position);
      const chunk = buffer.toString('utf-8') + remainder;
      const parts = chunk.split('\n');
      remainder = parts[0];
      for (let index = parts.length - 1; index >= 1; index -= 1) {
        if (parts[index].trim()) {
          lines.push(parts[index]);
        }
      }
    }

    if (remainder.trim()) {
      lines.push(remainder);
    }

    return lines.slice(0, maxLines).reverse();
  } finally {
    closeSync(fd);
  }
}

export function parseGlobalLogLine(raw: string): GlobalLogEntry {
  const match = raw.match(/^\[([^\]]+)\]\s+(\w+)\s+(?:\[([^\]]+)\]\s+)?(.*)$/);
  if (match) {
    return {
      raw,
      timestamp: match[1],
      level: match[2].toUpperCase(),
      context: match[3] ?? '',
      message: match[4] ?? raw,
    };
  }

  return {
    raw,
    level: 'INFO',
    timestamp: '',
    context: '',
    message: raw,
  };
}

export function listRotatingLogPaths(baseLogPath: string): string[] {
  const logDir = dirname(baseLogPath);
  if (!existsSync(logDir)) return [];

  const baseName = basename(baseLogPath);
  const stem = baseName.endsWith('.log') ? baseName.slice(0, -4) : baseName;
  const rotatedPattern = new RegExp(`^${escapeRegExp(stem)}\\d+\\.log$`);

  try {
    return readdirSync(logDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => name === baseName || rotatedPattern.test(name))
      .map((name) => join(logDir, name));
  } catch {
    return existsSync(baseLogPath) ? [baseLogPath] : [];
  }
}

function compareRotatingLogPaths(left: string, right: string): number {
  try {
    const leftStat = statSync(left);
    const rightStat = statSync(right);
    if (leftStat.mtimeMs !== rightStat.mtimeMs) {
      return leftStat.mtimeMs - rightStat.mtimeMs;
    }
  } catch {
    // fall back to lexical ordering
  }

  return left.localeCompare(right);
}

export function getLatestRotatingLogPath(baseLogPath: string): string | null {
  const candidates = listRotatingLogPaths(baseLogPath).sort(compareRotatingLogPaths);
  return candidates.at(-1) ?? null;
}

export function createRotatingLogCursor(baseLogPath: string): RotatingLogCursor {
  const latestLogPath = getLatestRotatingLogPath(baseLogPath);
  if (!latestLogPath) {
    return { path: null, offset: 0 };
  }

  try {
    return {
      path: latestLogPath,
      offset: statSync(latestLogPath).size,
    };
  } catch {
    return {
      path: latestLogPath,
      offset: 0,
    };
  }
}

export function readRecentRotatingLogEntries(baseLogPath: string, lastN = 200): GlobalLogEntry[] {
  const chunks: string[][] = [];
  let remaining = lastN;
  const candidates = listRotatingLogPaths(baseLogPath).sort(compareRotatingLogPaths).reverse();

  for (const filePath of candidates) {
    if (remaining <= 0) break;
    const lines = tailTextFile(filePath, remaining);
    if (lines.length === 0) continue;
    chunks.unshift(lines);
    remaining -= lines.length;
  }

  return chunks
    .flat()
    .slice(-lastN)
    .map(parseGlobalLogLine);
}

export function readRotatingLogEntriesSince(
  baseLogPath: string,
  cursor: number | RotatingLogCursor
): { lines: GlobalLogEntry[]; newOffset: number; cursor: RotatingLogCursor } {
  const latestLogPath = getLatestRotatingLogPath(baseLogPath);
  const normalizedCursor: RotatingLogCursor =
    typeof cursor === 'number'
      ? { path: baseLogPath, offset: cursor }
      : cursor;

  if (!latestLogPath) {
    return {
      lines: [],
      newOffset: normalizedCursor.offset,
      cursor: { path: null, offset: normalizedCursor.offset },
    };
  }

  const fileSize = statSync(latestLogPath).size;
  let readOffset = normalizedCursor.offset;
  if (normalizedCursor.path !== latestLogPath || readOffset > fileSize) {
    readOffset = 0;
  }

  if (fileSize <= readOffset) {
    return {
      lines: [],
      newOffset: fileSize,
      cursor: { path: latestLogPath, offset: fileSize },
    };
  }

  const readSize = fileSize - readOffset;
  const fd = openSync(latestLogPath, 'r');
  let content: string;
  try {
    const buffer = Buffer.alloc(readSize);
    readSync(fd, buffer, 0, readSize, readOffset);
    content = buffer.toString('utf-8');
  } finally {
    closeSync(fd);
  }

  const lines = content
    .split('\n')
    .filter((line) => line.trim())
    .map(parseGlobalLogLine);

  return {
    lines,
    newOffset: fileSize,
    cursor: { path: latestLogPath, offset: fileSize },
  };
}
