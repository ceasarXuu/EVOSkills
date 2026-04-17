import { closeSync, existsSync, openSync, readSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

export type IncrementalSessionReadOptions = {
  path: string;
  processedByteOffset: Map<string, number>;
  pendingLineFragment: Map<string, string>;
  extractSessionId?: (path: string) => string;
  logDebug?: (message: string, payload?: Record<string, unknown>) => void;
};

export type TailSessionReadOptions = {
  path: string;
  maxLines: number;
  readChunkSize: number;
};

export function extractSessionIdFromPath(path: string): string {
  const filename = basename(path, '.jsonl');
  const match = filename.match(/[a-f0-9-]{36}$/);
  return match ? match[0] : filename;
}

export function getFileSize(path: string): number | null {
  try {
    return statSync(path).size;
  } catch {
    return null;
  }
}

export function collectSessionFiles(
  dir: string,
  options?: {
    logDebug?: (message: string, payload?: Record<string, unknown>) => void;
  }
): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  const files: string[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...collectSessionFiles(fullPath, options));
      } else if (entry.isFile() && fullPath.endsWith('.jsonl')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    options?.logDebug?.('Failed to collect session files for bootstrap', {
      dir,
      error,
    });
  }

  return files;
}

export function readSessionLinesSinceOffset(
  options: IncrementalSessionReadOptions
): { lines: string[]; nextOffset: number } {
  const { path, processedByteOffset, pendingLineFragment } = options;
  const fileSize = statSync(path).size;
  const previousOffset = processedByteOffset.get(path) ?? 0;

  if (fileSize < previousOffset) {
    pendingLineFragment.delete(path);
  }

  const startOffset = fileSize < previousOffset ? 0 : previousOffset;
  if (fileSize <= startOffset) {
    return { lines: [], nextOffset: fileSize };
  }

  const fd = openSync(path, 'r');
  try {
    const readSize = fileSize - startOffset;
    const buffer = Buffer.alloc(readSize);
    readSync(fd, buffer, 0, readSize, startOffset);

    const previousFragment = pendingLineFragment.get(path) ?? '';
    const content = previousFragment + buffer.toString('utf-8');
    const parts = content.split('\n');
    const hasCompleteTrailingLine = content.endsWith('\n');
    const nextFragment = hasCompleteTrailingLine ? '' : (parts.pop() ?? '');

    if (nextFragment) {
      pendingLineFragment.set(path, nextFragment);
      options.logDebug?.('Buffered partial Codex session line awaiting completion', {
        sessionId: (options.extractSessionId ?? extractSessionIdFromPath)(path),
        path,
        fragmentChars: nextFragment.length,
      });
    } else {
      pendingLineFragment.delete(path);
    }

    return {
      lines: parts.filter((line) => line.trim()),
      nextOffset: fileSize,
    };
  } finally {
    closeSync(fd);
  }
}

export function readSessionTailLines(
  options: TailSessionReadOptions
): { lines: string[]; nextOffset: number } {
  const { path, maxLines, readChunkSize } = options;
  const fileSize = statSync(path).size;
  if (fileSize === 0 || maxLines <= 0) {
    return { lines: [], nextOffset: fileSize };
  }

  const fd = openSync(path, 'r');
  try {
    let position = fileSize;
    let remainder = '';
    const lines: string[] = [];

    while (position > 0 && lines.length < maxLines) {
      const size = Math.min(readChunkSize, position);
      position -= size;
      const buffer = Buffer.alloc(size);
      readSync(fd, buffer, 0, size, position);
      const chunk = buffer.toString('utf-8') + remainder;
      const parts = chunk.split('\n');
      remainder = parts[0] ?? '';

      for (let index = parts.length - 1; index >= 1 && lines.length < maxLines; index -= 1) {
        const line = parts[index];
        if (line.trim()) {
          lines.push(line);
        }
      }
    }

    if (remainder.trim() && lines.length < maxLines) {
      lines.push(remainder);
    }

    return {
      lines: lines.reverse(),
      nextOffset: fileSize,
    };
  } finally {
    closeSync(fd);
  }
}
