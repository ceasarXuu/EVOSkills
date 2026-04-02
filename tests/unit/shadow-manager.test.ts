import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { createShadowManager } from '../../src/core/shadow-manager/index.js';

describe('ShadowManager', () => {
  const testProjectPath = join(tmpdir(), 'ornn-sm-test-' + Date.now());

  beforeEach(() => {
    mkdirSync(testProjectPath, { recursive: true });
    mkdirSync(join(testProjectPath, '.ornn', 'skills'), { recursive: true });
    mkdirSync(join(testProjectPath, '.ornn', 'state'), { recursive: true });
    mkdirSync(join(testProjectPath, '.ornn', 'shadows'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testProjectPath)) {
      rmSync(testProjectPath, { recursive: true, force: true });
    }
  });

  it('should initialize without errors', async () => {
    const manager = createShadowManager(testProjectPath);
    await expect(manager.init()).resolves.not.toThrow();
  });

  it('should cleanup old traces', async () => {
    const manager = createShadowManager(testProjectPath);
    await manager.init();
    const cleaned = manager.cleanupOldTraces(30);
    expect(typeof cleaned).toBe('number');
  });

  it('should return null for non-existent skill state', async () => {
    const manager = createShadowManager(testProjectPath);
    await manager.init();
    const state = manager.getShadowState('non-existent@' + testProjectPath);
    expect(state).toBeNull();
  });

  it('should close without errors', async () => {
    const manager = createShadowManager(testProjectPath);
    await manager.init();
    expect(() => manager.close()).not.toThrow();
  });

  it('should process trace without errors', async () => {
    const manager = createShadowManager(testProjectPath);
    await manager.init();
    const trace = {
      trace_id: 'test-1',
      session_id: 'sess-1',
      turn_id: 'turn-1',
      runtime: 'codex' as const,
      event_type: 'user_input' as const,
      status: 'completed' as const,
      timestamp: new Date().toISOString(),
    };
    expect(() => manager.processTrace(trace)).not.toThrow();
  });
});
