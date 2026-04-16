import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createRotatingLogCursor,
  readRecentRotatingLogEntries,
  readRotatingLogEntriesSince,
} from '../../src/utils/global-log-source.js';

describe('global log source', () => {
  const testRoot = join(tmpdir(), `ornn-global-log-source-${Date.now()}`);

  afterEach(() => {
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true });
    }
  });

  it('reads the latest entries across rotated log files as one logical stream', async () => {
    const logDir = join(testRoot, '.ornn', 'logs');
    mkdirSync(logDir, { recursive: true });

    writeFileSync(
      join(logDir, 'combined.log'),
      '[2026-04-17 03:00:01] INFO  [daemon] old log line\n',
      'utf-8'
    );
    await new Promise((resolve) => setTimeout(resolve, 5));
    writeFileSync(
      join(logDir, 'combined1.log'),
      '[2026-04-17 05:09:07] INFO  [daemon] new rotated log line\n',
      'utf-8'
    );

    const lines = readRecentRotatingLogEntries(join(logDir, 'combined.log'), 10);

    expect(lines.map((line) => line.message)).toContain('old log line');
    expect(lines.at(-1)?.message).toContain('new rotated log line');
  });

  it('continues reading from the newest rotated file after the base file has rolled over', async () => {
    const logDir = join(testRoot, '.ornn', 'logs');
    mkdirSync(logDir, { recursive: true });

    const basePath = join(logDir, 'combined.log');
    writeFileSync(
      basePath,
      '[2026-04-17 03:00:01] INFO  [daemon] old log line '.repeat(40) + '\n',
      'utf-8'
    );

    const initialCursor = createRotatingLogCursor(basePath);
    expect(initialCursor.offset).toBe(statSync(basePath).size);

    await new Promise((resolve) => setTimeout(resolve, 5));
    writeFileSync(
      join(logDir, 'combined1.log'),
      '[2026-04-17 05:09:07] INFO  [daemon] new rotated log line\n',
      'utf-8'
    );

    const result = readRotatingLogEntriesSince(basePath, initialCursor);

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.message).toContain('new rotated log line');
    expect(result.cursor.path).toContain('combined1.log');
    expect(result.newOffset).toBeGreaterThan(0);
  });
});
