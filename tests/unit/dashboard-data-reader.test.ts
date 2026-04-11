import { beforeEach, describe, expect, it, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readProjectSnapshotVersion } from '../../src/dashboard/data-reader.js';

describe('dashboard data reader snapshot version', () => {
  const testDir = join(tmpdir(), 'ornn-dashboard-data-reader-' + Date.now());

  beforeEach(() => {
    mkdirSync(join(testDir, '.ornn', 'state'), { recursive: true });
    mkdirSync(join(testDir, '.ornn', 'shadows'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('changes when agent usage ndjson changes', async () => {
    const usagePath = join(testDir, '.ornn', 'state', 'agent-usage.ndjson');
    writeFileSync(usagePath, '', 'utf-8');

    const before = readProjectSnapshotVersion(testDir);

    await new Promise((resolve) => setTimeout(resolve, 5));
    writeFileSync(
      usagePath,
      JSON.stringify({
        timestamp: '2026-04-12T01:00:00.000Z',
        model: 'deepseek/deepseek-chat',
        scope: 'scope-1',
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
        durationMs: 200,
      }) + '\n',
      'utf-8'
    );

    const after = readProjectSnapshotVersion(testDir);
    expect(after).not.toBe(before);
  });
});
