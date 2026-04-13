import { describe, expect, it } from 'vitest';
import type { EvaluationResult, WindowAnalysisHint } from '../../src/types/index.js';
import { resolveWindowAnalysisOutcome } from '../../src/core/window-analysis-outcome/index.js';

const evaluation: EvaluationResult = {
  should_patch: true,
  change_type: 'prune_noise',
  target_section: 'TODO',
  reason: 'Repeated noise should be pruned.',
  source_sessions: ['sess-1'],
  confidence: 0.91,
  rule_name: 'llm_window_analysis',
};

const nextWindowHint: WindowAnalysisHint = {
  suggestedTraceDelta: 6,
  suggestedTurnDelta: 2,
  waitForEventTypes: [],
  mode: 'count_driven',
};

describe('resolveWindowAnalysisOutcome', () => {
  it('returns an explicit failure when normalized evaluation is missing', () => {
    const outcome = resolveWindowAnalysisOutcome({
      analysis: {
        success: true,
        decision: 'no_optimization',
        model: 'deepseek/deepseek-chat',
        userMessage: 'No optimization needed.',
        tokenUsage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      },
    });

    expect(outcome).toMatchObject({
      kind: 'analysis_failed',
      reasonCode: 'missing_normalized_evaluation',
    });
  });

  it('requires next window hint when analysis asks for more context', () => {
    const outcome = resolveWindowAnalysisOutcome({
      analysis: {
        success: true,
        decision: 'need_more_context',
        model: 'deepseek/deepseek-chat',
        evaluation,
        tokenUsage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      },
    });

    expect(outcome).toMatchObject({
      kind: 'analysis_failed',
      reasonCode: 'missing_next_window_hint',
    });
  });

  it('classifies incomplete patch context as a dedicated branch', () => {
    const outcome = resolveWindowAnalysisOutcome({
      analysis: {
        success: true,
        decision: 'apply_optimization',
        model: 'deepseek/deepseek-chat',
        evaluation: {
          ...evaluation,
          target_section: undefined,
        },
        nextWindowHint,
        tokenUsage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      },
      getPatchContextIssue(current) {
        if (!current.target_section) return 'missing_target_section';
        return null;
      },
    });

    expect(outcome).toMatchObject({
      kind: 'incomplete_patch_context',
      issue: 'missing_target_section',
      nextWindowHint,
    });
  });

  it('returns apply_optimization for executable patch recommendations', () => {
    const outcome = resolveWindowAnalysisOutcome({
      analysis: {
        success: true,
        decision: 'apply_optimization',
        model: 'deepseek/deepseek-chat',
        evaluation,
        nextWindowHint,
        tokenUsage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      },
    });

    expect(outcome).toMatchObject({
      kind: 'apply_optimization',
      evaluation,
    });
  });
});
