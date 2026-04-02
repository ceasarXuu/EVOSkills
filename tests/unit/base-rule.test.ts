import { describe, it, expect } from 'vitest';
import { BaseRule } from '../../src/core/evaluator/base-rule.js';
import type { Trace, EvaluationResult } from '../../src/types/index.js';

class TestRule extends BaseRule {
  constructor() {
    super('test-rule', 'Test rule for coverage');
  }
  evaluate(_traces: Trace[]): EvaluationResult | null {
    return null;
  }
}

describe('BaseRule', () => {
  it('should have name and description', () => {
    const rule = new TestRule();
    expect(rule.getName()).toBe('test-rule');
    expect(rule.getDescription()).toBe('Test rule for coverage');
  });

  it('should extract unique session IDs', () => {
    const rule = new TestRule();
    const traces: Trace[] = [
      { trace_id: '1', session_id: 's-1', turn_id: 't1', runtime: 'codex', event_type: 'user_input', status: 'success', timestamp: '2024-01-01' },
      { trace_id: '2', session_id: 's-1', turn_id: 't1', runtime: 'codex', event_type: 'user_input', status: 'success', timestamp: '2024-01-02' },
      { trace_id: '3', session_id: 's-2', turn_id: 't1', runtime: 'codex', event_type: 'user_input', status: 'success', timestamp: '2024-01-03' },
    ];
    const sessionIds = (rule as any).extractSessionIds(traces);
    expect(sessionIds.sort()).toEqual(['s-1', 's-2']);
  });

  it('should filter by event type', () => {
    const rule = new TestRule();
    const traces: Trace[] = [
      { trace_id: '1', session_id: 's-1', turn_id: 't1', runtime: 'codex', event_type: 'user_input', status: 'success', timestamp: '2024-01-01' },
      { trace_id: '2', session_id: 's-1', turn_id: 't1', runtime: 'codex', event_type: 'assistant_output', status: 'success', timestamp: '2024-01-02' },
    ];
    const userTraces = (rule as any).filterByEventType(traces, 'user_input');
    expect(userTraces.length).toBe(1);
  });

  it('should filter by status', () => {
    const rule = new TestRule();
    const traces: Trace[] = [
      { trace_id: '1', session_id: 's-1', turn_id: 't1', runtime: 'codex', event_type: 'user_input', status: 'success', timestamp: '2024-01-01' },
      { trace_id: '2', session_id: 's-1', turn_id: 't1', runtime: 'codex', event_type: 'user_input', status: 'failure', timestamp: '2024-01-02' },
    ];
    const failedTraces = (rule as any).filterByStatus(traces, 'failure');
    expect(failedTraces.length).toBe(1);
  });

  it('should get failed traces', () => {
    const rule = new TestRule();
    const traces: Trace[] = [
      { trace_id: '1', session_id: 's-1', turn_id: 't1', runtime: 'codex', event_type: 'user_input', status: 'success', timestamp: '2024-01-01' },
      { trace_id: '2', session_id: 's-1', turn_id: 't1', runtime: 'codex', event_type: 'user_input', status: 'failure', timestamp: '2024-01-02' },
    ];
    const failedTraces = (rule as any).getFailedTraces(traces);
    expect(failedTraces.length).toBe(1);
  });

  it('should get retry traces', () => {
    const rule = new TestRule();
    const traces: Trace[] = [
      { trace_id: '1', session_id: 's-1', turn_id: 't1', runtime: 'codex', event_type: 'retry', status: 'success', timestamp: '2024-01-01' },
      { trace_id: '2', session_id: 's-1', turn_id: 't1', runtime: 'codex', event_type: 'user_input', status: 'success', timestamp: '2024-01-02' },
    ];
    const retryTraces = (rule as any).getRetryTraces(traces);
    expect(retryTraces.length).toBe(1);
  });

  it('should get file change traces', () => {
    const rule = new TestRule();
    const traces: Trace[] = [
      { trace_id: '1', session_id: 's-1', turn_id: 't1', runtime: 'codex', event_type: 'file_change', status: 'success', timestamp: '2024-01-01' },
      { trace_id: '2', session_id: 's-1', turn_id: 't1', runtime: 'codex', event_type: 'user_input', status: 'success', timestamp: '2024-01-02' },
    ];
    const fileChangeTraces = (rule as any).getFileChangeTraces(traces);
    expect(fileChangeTraces.length).toBe(1);
  });

  it('should calculate confidence correctly', () => {
    const rule = new TestRule();
    const confidence = (rule as any).calculateConfidence(5, 3);
    expect(confidence).toBeGreaterThan(0.5);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it('should return 0 confidence for no signals', () => {
    const rule = new TestRule();
    const confidence = (rule as any).calculateConfidence(0, 0);
    expect(confidence).toBe(0);
  });

  it('should cap confidence at 1', () => {
    const rule = new TestRule();
    const confidence = (rule as any).calculateConfidence(100, 100);
    expect(confidence).toBe(1);
  });
});
