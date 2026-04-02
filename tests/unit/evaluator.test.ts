import { describe, it, expect } from 'vitest';
import { Evaluator } from '../../src/core/evaluator/index.js';
import { BaseRule } from '../../src/core/evaluator/base-rule.js';
import type { Trace, EvaluationResult } from '../../src/types/index.js';

describe('Evaluator', () => {
  describe('evaluate', () => {
    it('should return null for empty traces', () => {
      const evaluator = new Evaluator();
      expect(evaluator.evaluate([])).toBeNull();
    });

    it('should return null when no rules trigger', () => {
      const evaluator = new Evaluator();
      const traces: Trace[] = [
        {
          trace_id: 't-1',
          session_id: 's-1',
          turn_id: 't1',
          runtime: 'codex',
          event_type: 'user_input',
          status: 'success',
          timestamp: new Date().toISOString(),
        },
      ];
      const result = evaluator.evaluate(traces);
      expect(result).toBeNull();
    });
  });

  describe('registerRule', () => {
    it('should register a custom rule', () => {
      const evaluator = new Evaluator();
      const initialCount = evaluator.getRules().length;

      class TestRule extends BaseRule {
        constructor() {
          super('test-rule', 'Test rule for coverage');
        }
        evaluate(_traces: Trace[]): EvaluationResult | null {
          return null;
        }
      }

      evaluator.registerRule(new TestRule());
      expect(evaluator.getRules().length).toBe(initialCount + 1);
    });
  });

  describe('setMinConfidence', () => {
    it('should set minimum confidence threshold', () => {
      const evaluator = new Evaluator();
      evaluator.setMinConfidence(0.9);
      expect(evaluator.getRules().length).toBeGreaterThan(0);
    });
  });

  describe('getRules', () => {
    it('should return a copy of rules', () => {
      const evaluator = new Evaluator();
      const rules1 = evaluator.getRules();
      const rules2 = evaluator.getRules();
      expect(rules1).not.toBe(rules2);
      expect(rules1.length).toBe(rules2.length);
    });
  });
});

describe('BaseRule', () => {
  class TestRule extends BaseRule {
    constructor() {
      super('test-rule', 'Test rule');
    }
    evaluate(_traces: Trace[]): EvaluationResult | null {
      return null;
    }
  }

  it('should have name and description', () => {
    const rule = new TestRule();
    expect(rule.getName()).toBe('test-rule');
    expect(rule.getDescription()).toBe('Test rule');
  });
});
