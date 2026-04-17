import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stopDaemonProcess } from '../../src/cli/commands/daemon/process-manager.js';

describe('daemon process manager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('force kills a process after the polling budget is exhausted', async () => {
    const isProcessRunning = vi.fn(() => true);
    const sendSignal = vi.fn();

    const promise = stopDaemonProcess(42, {
      isProcessRunning,
      sendSignal,
      maxAttempts: 2,
      intervalMs: 1000,
    });

    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;

    expect(result).toMatchObject({
      stopped: false,
      forced: true,
    });
    expect(sendSignal).toHaveBeenNthCalledWith(1, 42, 'SIGTERM');
    expect(sendSignal).toHaveBeenNthCalledWith(2, 42, 'SIGKILL');
  });

  it('stops polling once the process exits cleanly', async () => {
    const isProcessRunning = vi
      .fn()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    const sendSignal = vi.fn();

    const promise = stopDaemonProcess(7, {
      isProcessRunning,
      sendSignal,
      maxAttempts: 3,
      intervalMs: 1000,
    });

    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result).toMatchObject({
      stopped: true,
      forced: false,
    });
    expect(sendSignal).toHaveBeenCalledTimes(1);
    expect(sendSignal).toHaveBeenCalledWith(7, 'SIGTERM');
  });
});