import { describe, it, expect, vi } from 'vitest';
import { TraceRouter, createTraceRouter } from '../../src/core/router/router.js';
import type { Trace, TraceSkillMapping } from '../../src/types/index.js';

describe('TraceRouter', () => {
  const makeTrace = (id: string, skillRefs?: string[], userInput?: string, assistantOutput?: string): Trace => ({
    trace_id: id,
    session_id: 'sess-1',
    turn_id: 't1',
    runtime: 'codex',
    event_type: 'user_input',
    status: 'success',
    timestamp: new Date().toISOString(),
    skill_refs: skillRefs,
    user_input: userInput,
    assistant_output: assistantOutput,
  });

  describe('route', () => {
    it('should route trace with skill references', () => {
      const onSkillTrace = vi.fn();
      const router = createTraceRouter({
        projectPath: '/test',
        onSkillTrace,
      });

      const result = router.route(makeTrace('t-1', ['skill-a']));
      expect(result.routed).toBe(true);
      expect(result.skillRefs).toEqual(['skill-a']);
      expect(result.mappings.length).toBe(1);
      expect(onSkillTrace).toHaveBeenCalled();
    });

    it('should handle trace without skill references', () => {
      const onUnknownTrace = vi.fn();
      const onSkillTrace = vi.fn();
      const router = createTraceRouter({
        projectPath: '/test',
        onSkillTrace,
        onUnknownTrace,
      });

      const result = router.route(makeTrace('t-1'));
      expect(result.routed).toBe(false);
      expect(result.skillRefs).toEqual([]);
      expect(onUnknownTrace).toHaveBeenCalled();
      expect(onSkillTrace).not.toHaveBeenCalled();
    });

    it('should handle trace without onUnknownTrace callback', () => {
      const onSkillTrace = vi.fn();
      const router = createTraceRouter({
        projectPath: '/test',
        onSkillTrace,
      });

      const result = router.route(makeTrace('t-1'));
      expect(result.routed).toBe(false);
    });

    it('should route trace to multiple skills', () => {
      const onSkillTrace = vi.fn();
      const router = createTraceRouter({
        projectPath: '/test',
        onSkillTrace,
      });

      const result = router.route(makeTrace('t-1', ['skill-a', 'skill-b']));
      expect(result.routed).toBe(true);
      expect(result.mappings.length).toBe(2);
      expect(onSkillTrace).toHaveBeenCalledTimes(2);
    });

    it('should parse skill reference with shadow id', () => {
      const onSkillTrace = vi.fn();
      const router = createTraceRouter({
        projectPath: '/test',
        onSkillTrace,
      });

      router.route(makeTrace('t-1', ['skill-a@shadow-1']));
      const mapping = onSkillTrace.mock.calls[0][0] as TraceSkillMapping;
      expect(mapping.skill_id).toBe('skill-a');
      expect(mapping.shadow_id).toBe('shadow-1');
    });

    it('should calculate higher confidence when skill mentioned in user input', () => {
      const onSkillTrace = vi.fn();
      const router = createTraceRouter({
        projectPath: '/test',
        onSkillTrace,
      });

      router.route(makeTrace('t-1', ['my-skill'], 'use my-skill please'));
      const mapping = onSkillTrace.mock.calls[0][0] as TraceSkillMapping;
      expect(mapping.confidence).toBeGreaterThan(0.5);
    });

    it('should calculate higher confidence when skill mentioned in assistant output', () => {
      const onSkillTrace = vi.fn();
      const router = createTraceRouter({
        projectPath: '/test',
        onSkillTrace,
      });

      router.route(makeTrace('t-1', ['my-skill'], undefined, 'using my-skill'));
      const mapping = onSkillTrace.mock.calls[0][0] as TraceSkillMapping;
      expect(mapping.confidence).toBeGreaterThan(0.5);
    });

    it('should cap confidence at 1.0', () => {
      const onSkillTrace = vi.fn();
      const router = createTraceRouter({
        projectPath: '/test',
        onSkillTrace,
      });

      router.route(makeTrace('t-1', ['my-skill'], 'my-skill', 'my-skill'));
      const mapping = onSkillTrace.mock.calls[0][0] as TraceSkillMapping;
      expect(mapping.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('routeBatch', () => {
    it('should route multiple traces', () => {
      const onSkillTrace = vi.fn();
      const router = createTraceRouter({
        projectPath: '/test',
        onSkillTrace,
      });

      const traces = [
        makeTrace('t-1', ['skill-a']),
        makeTrace('t-2', ['skill-b']),
      ];
      const results = router.routeBatch(traces);
      expect(results.length).toBe(2);
      expect(results[0].routed).toBe(true);
      expect(results[1].routed).toBe(true);
    });
  });

  describe('getRouteHistory', () => {
    it('should return history for routed trace', () => {
      const onSkillTrace = vi.fn();
      const router = createTraceRouter({
        projectPath: '/test',
        onSkillTrace,
      });

      router.route(makeTrace('t-1', ['skill-a']));
      const history = router.getRouteHistory('t-1');
      expect(history).toBeDefined();
      expect(history?.routed).toBe(true);
    });

    it('should return undefined for non-existent trace', () => {
      const onSkillTrace = vi.fn();
      const router = createTraceRouter({
        projectPath: '/test',
        onSkillTrace,
      });

      expect(router.getRouteHistory('non-existent')).toBeUndefined();
    });
  });

  describe('getAllRouteHistory', () => {
    it('should return all history', () => {
      const onSkillTrace = vi.fn();
      const router = createTraceRouter({
        projectPath: '/test',
        onSkillTrace,
      });

      router.route(makeTrace('t-1', ['skill-a']));
      router.route(makeTrace('t-2', ['skill-b']));
      const history = router.getAllRouteHistory();
      expect(history.length).toBe(2);
    });
  });

  describe('clearHistory', () => {
    it('should clear all history', () => {
      const onSkillTrace = vi.fn();
      const router = createTraceRouter({
        projectPath: '/test',
        onSkillTrace,
      });

      router.route(makeTrace('t-1', ['skill-a']));
      router.clearHistory();
      expect(router.getAllRouteHistory().length).toBe(0);
    });
  });

  describe('filterByRuntime', () => {
    it('should filter traces by runtime', () => {
      const onSkillTrace = vi.fn();
      const router = createTraceRouter({
        projectPath: '/test',
        onSkillTrace,
      });

      const traces = [
        { ...makeTrace('t-1'), runtime: 'codex' as const },
        { ...makeTrace('t-2'), runtime: 'claude' as const },
      ];
      const filtered = router.filterByRuntime(traces, 'codex');
      expect(filtered.length).toBe(1);
      expect(filtered[0].trace_id).toBe('t-1');
    });
  });

  describe('filterBySkill', () => {
    it('should filter traces by skill reference', () => {
      const onSkillTrace = vi.fn();
      const router = createTraceRouter({
        projectPath: '/test',
        onSkillTrace,
      });

      const traces = [
        makeTrace('t-1', ['skill-a']),
        makeTrace('t-2', ['skill-b']),
        makeTrace('t-3', ['skill-a@shadow-1']),
      ];
      const filtered = router.filterBySkill(traces, 'skill-a');
      expect(filtered.length).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return routing statistics', () => {
      const onSkillTrace = vi.fn();
      const onUnknownTrace = vi.fn();
      const router = createTraceRouter({
        projectPath: '/test',
        onSkillTrace,
        onUnknownTrace,
      });

      router.route(makeTrace('t-1', ['skill-a']));
      router.route(makeTrace('t-2'));
      router.route(makeTrace('t-3', ['skill-a', 'skill-b']));

      const stats = router.getStats();
      expect(stats.totalRouted).toBe(2);
      expect(stats.totalUnknown).toBe(1);
      expect(stats.topSkills.length).toBeGreaterThan(0);
      expect(stats.averageSkillsPerTrace).toBeGreaterThan(0);
    });

    it('should return zero stats when no history', () => {
      const onSkillTrace = vi.fn();
      const router = createTraceRouter({
        projectPath: '/test',
        onSkillTrace,
      });

      const stats = router.getStats();
      expect(stats.totalRouted).toBe(0);
      expect(stats.totalUnknown).toBe(0);
      expect(stats.averageSkillsPerTrace).toBe(0);
      expect(stats.topSkills).toEqual([]);
    });
  });

  describe('enforceHistoryLimit', () => {
    it('should enforce history size limit', () => {
      const onSkillTrace = vi.fn();
      const router = createTraceRouter({
        projectPath: '/test',
        onSkillTrace,
      });

      // Add more than maxHistorySize (10000) traces
      for (let i = 0; i < 10001; i++) {
        router.route(makeTrace(`t-${i}`, ['skill-a']));
      }

      const history = router.getAllRouteHistory();
      expect(history.length).toBeLessThanOrEqual(10000);
    });
  });
});
