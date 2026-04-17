import { describe, expect, it, vi } from 'vitest';

import { startDashboardServerOnAvailablePort } from '../../src/cli/commands/daemon/dashboard-launcher.js';

describe('daemon dashboard launcher', () => {
  it('increments the port until a server starts successfully', async () => {
    const firstServer = {
      start: vi.fn(async () => {
        throw new Error('port busy');
      }),
      stop: vi.fn(async () => {}),
    };
    const secondServer = {
      start: vi.fn(async () => {}),
      stop: vi.fn(async () => {}),
    };
    const createServer = vi
      .fn()
      .mockReturnValueOnce(firstServer)
      .mockReturnValueOnce(secondServer);

    const result = await startDashboardServerOnAvailablePort(47432, 'zh', {
      createServer,
      maxAttempts: 2,
    });

    expect(createServer).toHaveBeenNthCalledWith(1, 47432, 'zh');
    expect(createServer).toHaveBeenNthCalledWith(2, 47433, 'zh');
    expect(result.port).toBe(47433);
    expect(result.server).toBe(secondServer);
  });

  it('throws when all candidate ports fail', async () => {
    const createServer = vi.fn(() => ({
      start: vi.fn(async () => {
        throw new Error('still busy');
      }),
      stop: vi.fn(async () => {}),
    }));

    await expect(
      startDashboardServerOnAvailablePort(47432, 'en', {
        createServer,
        maxAttempts: 2,
      })
    ).rejects.toThrow('Could not find an available port');
  });
});