import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  createDashboardServer: vi.fn(),
  cliInfo: vi.fn(),
}));

vi.mock('../../src/dashboard/server.js', () => ({
  createDashboardServer: mocks.createDashboardServer,
}));

vi.mock('../../src/utils/cli-output.js', () => ({
  cliInfo: mocks.cliInfo,
}));

describe('dashboard command', () => {
  beforeEach(() => {
    mocks.start.mockResolvedValue(undefined);
    mocks.stop.mockResolvedValue(undefined);
    mocks.createDashboardServer.mockReturnValue({
      start: mocks.start,
      stop: mocks.stop,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('registers synchronous signal handlers while still stopping the server', async () => {
    const onceSpy = vi
      .spyOn(process, 'once')
      .mockImplementation(((..._args: unknown[]) => process) as typeof process.once);
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(((_code?: number) => undefined) as typeof process.exit);

    const { createDashboardCommand } = await import('../../src/cli/commands/dashboard.js');

    await createDashboardCommand().parseAsync(['node', 'dashboard', '--no-open'], {
      from: 'user',
    });

    const sigintRegistration = onceSpy.mock.calls.find(([signal]) => signal === 'SIGINT');
    expect(sigintRegistration).toBeDefined();

    const handler = sigintRegistration?.[1];
    expect(typeof handler).toBe('function');

    const result = (handler as () => unknown)();

    expect(result).toBeUndefined();
    expect(mocks.stop).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
