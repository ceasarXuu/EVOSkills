import { describe, expect, it } from 'vitest';

import { buildSkillCallAnalyzerPrompt } from '../../src/core/skill-call-analyzer/prompt-builder.js';
import {
  describeSkillCallAnalysisFailure,
  parseSkillCallAnalyzerPayload,
} from '../../src/core/skill-call-analyzer/response-parser.js';
import type { SkillCallWindow } from '../../src/core/skill-call-window/index.js';

const windowFixture: SkillCallWindow = {
  windowId: 'window-1',
  skillId: 'test-skill',
  runtime: 'codex',
  sessionId: 'session-1',
  closeReason: 'completed',
  startedAt: '2026-04-10T00:00:00.000Z',
  lastTraceAt: '2026-04-10T00:01:00.000Z',
  traces: [
    {
      trace_id: 'trace-1',
      runtime: 'codex',
      session_id: 'session-1',
      turn_id: 'turn-1',
      event_type: 'user_input',
      timestamp: '2026-04-10T00:00:00.000Z',
      status: 'success',
      user_input: 'Please use test-skill to continue.',
      skill_refs: ['test-skill'],
    },
    {
      trace_id: 'trace-2',
      runtime: 'codex',
      session_id: 'session-1',
      turn_id: 'turn-2',
      event_type: 'tool_result',
      timestamp: '2026-04-10T00:01:00.000Z',
      status: 'failure',
      tool_result: { message: 'failed' },
      files_changed: ['src/example.ts'],
    },
  ],
};

describe('skill call analyzer helper modules', () => {
  it('builds a zh prompt with localized snapshot lines and a custom source prompt', () => {
    const prompt = buildSkillCallAnalyzerPrompt(
      windowFixture,
      '# skill content',
      'zh',
      '务必补充一句自定义提示。',
      'custom'
    );

    expect(prompt.systemPrompt).toBe('务必补充一句自定义提示。');
    expect(prompt.userPrompt).toContain('显式 skill 提及次数: 1');
    expect(prompt.userPrompt).toContain('工具失败数: 1');
    expect(prompt.userPrompt).toContain('文件变更事件数: 1');
  });

  it('parses apply_optimization payloads into an evaluation', () => {
    const result = parseSkillCallAnalyzerPayload(
      {
        decision: 'apply_optimization',
        reason: 'Need to tighten the trigger.',
        confidence: 0.88,
        next_window_hint: {
          suggested_trace_delta: 4,
          suggested_turn_delta: 2,
          wait_for_event_types: ['tool_result'],
          mode: 'event_driven',
        },
        change_type: 'tighten_trigger',
        target_section: 'Trigger Rules',
        pattern: 'single failure after tool retries',
        evidence: ['Tool failed twice', 'Assistant repeated the same path'],
      },
      windowFixture,
      'en'
    );

    expect(result.decision).toBe('apply_optimization');
    expect(result.hint).toMatchObject({
      suggestedTraceDelta: 4,
      suggestedTurnDelta: 2,
      waitForEventTypes: ['tool_result'],
      mode: 'event_driven',
    });
    expect(result.evaluation).toMatchObject({
      should_patch: true,
      change_type: 'tighten_trigger',
      target_section: 'Trigger Rules',
      confidence: 0.88,
      source_sessions: ['session-1'],
    });
  });

  it('falls back to need_more_context when the payload is incomplete', () => {
    const result = parseSkillCallAnalyzerPayload(
      {
        decision: 'unexpected-value',
        confidence: 'wrong-type',
      },
      windowFixture,
      'zh'
    );

    expect(result.decision).toBe('need_more_context');
    expect(result.fallbackReason).toContain('需要继续观察更多上下文');
    expect(result.hint).toMatchObject({
      suggestedTraceDelta: 6,
      suggestedTurnDelta: 2,
      waitForEventTypes: [],
      mode: 'count_driven',
    });
  });

  it('describes invalid json failures with a raw response excerpt', () => {
    const failure = describeSkillCallAnalysisFailure('invalid_analysis_json', 'en', {
      rawResponse: '{not-json}\n{"decision":"no_optimization"}',
    });

    expect(failure.errorCode).toBe('invalid_analysis_json');
    expect(failure.userMessage).toContain('required JSON format');
    expect(failure.technicalDetail).toContain('Raw model response excerpt');
    expect(failure.technicalDetail).toContain('{"decision":"no_optimization"}');
  });
});
