import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { createTraceManager } from '../../src/core/observer/trace-manager.js';

describe('TraceManager', () => {
  const testProjectPath = join(tmpdir(), 'ornn-tm-test-' + Date.now());

  beforeEach(() => {
    mkdirSync(testProjectPath, { recursive: true });
    mkdirSync(join(testProjectPath, '.ornn', 'state'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testProjectPath)) {
      rmSync(testProjectPath, { recursive: true, force: true });
    }
  });

  describe('init', () => {
    it('should initialize without errors', async () => {
      const manager = createTraceManager(testProjectPath);
      await expect(manager.init()).resolves.not.toThrow();
      manager.close();
    });
  });

  describe('setSession', () => {
    it('should set current session', async () => {
      const manager = createTraceManager(testProjectPath);
      await manager.init();
      manager.setSession('sess-1', 'codex');
      expect(manager.getCurrentSessionId()).toBe('sess-1');
      manager.close();
    });
  });

  describe('endSession', () => {
    it('should end current session', async () => {
      const manager = createTraceManager(testProjectPath);
      await manager.init();
      manager.setSession('sess-1', 'codex');
      manager.endSession();
      expect(manager.getCurrentSessionId()).toBeNull();
      manager.close();
    });

    it('should do nothing when no session', async () => {
      const manager = createTraceManager(testProjectPath);
      await manager.init();
      expect(() => manager.endSession()).not.toThrow();
      manager.close();
    });
  });

  describe('getCurrentSessionId', () => {
    it('should return null initially', async () => {
      const manager = createTraceManager(testProjectPath);
      await manager.init();
      expect(manager.getCurrentSessionId()).toBeNull();
      manager.close();
    });
  });

  describe('close', () => {
    it('should close without errors', async () => {
      const manager = createTraceManager(testProjectPath);
      await manager.init();
      expect(() => manager.close()).not.toThrow();
    });

    it('should throw when not initialized', () => {
      const manager = createTraceManager(testProjectPath);
      expect(() => manager.close()).toThrow('TraceManager not initialized');
    });
  });

  describe('cleanupOldTraces', () => {
    it('should return 0', async () => {
      const manager = createTraceManager(testProjectPath);
      await manager.init();
      expect(manager.cleanupOldTraces(30)).toBe(0);
      manager.close();
    });
  });
});
