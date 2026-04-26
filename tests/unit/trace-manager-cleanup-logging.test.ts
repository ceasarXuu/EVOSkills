import { describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const loggerMock = {
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
};

vi.mock('../../src/utils/logger.js', () => ({
  createChildLogger: () => loggerMock,
  logger: loggerMock,
}));

describe('TraceManager cleanup logging', () => {
  it('does not emit an info log when cleanup is still a no-op', async () => {
    const projectRoot = join(tmpdir(), `ornn-trace-cleanup-log-${Date.now()}`);
    mkdirSync(join(projectRoot, '.ornn', 'state'), { recursive: true });

    try {
      const { createTraceManager } = await import('../../src/core/observer/trace-manager.js');
      const manager = createTraceManager(projectRoot);
      await manager.init();

      expect(manager.cleanupOldTraces(30)).toBe(0);
      expect(loggerMock.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Cleanup old traces older than 30 days')
      );

      manager.close();
    } finally {
      if (existsSync(projectRoot)) {
        rmSync(projectRoot, { recursive: true, force: true });
      }
    }
  });
});
