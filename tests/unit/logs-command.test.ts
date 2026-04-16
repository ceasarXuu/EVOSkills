import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLogsCommand } from '../../src/cli/commands/logs.js';

describe('logs command', () => {
  const testRoot = join(tmpdir(), `ornn-logs-command-${Date.now()}`);

  afterEach(() => {
    vi.restoreAllMocks();
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true });
    }
  });

  it('shows the newest rotated combined log entries in the logical combined stream', async () => {
    const fakeHome = join(testRoot, 'home');
    const logDir = join(fakeHome, '.ornn', 'logs');
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

    const originalHome = process.env.HOME;
    process.env.HOME = fakeHome;

    const output: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      output.push(String(message ?? ''));
    });

    try {
      const command = createLogsCommand();
      await command.parseAsync(['node', 'logs', '--tail', '10', '--level', 'info', '--raw'], {
        from: 'user',
      });
    } finally {
      process.env.HOME = originalHome;
    }

    const rendered = output.join('\n');
    expect(rendered).toContain('combined.log');
    expect(rendered).toContain('new rotated log line');
    expect(rendered).not.toContain('combined1.log');
  });
});
