import { describe, expect, it } from 'vitest';
import {
  needsNarrativeFallback,
  normalizeNarrativeArray,
  normalizeNarrativeString,
} from '../../src/core/llm-localization/index.js';

describe('llm localization', () => {
  it('falls back when zh narratives contain only english prose', () => {
    expect(needsNarrativeFallback('The skill was correctly invoked and followed.', 'zh')).toBe(true);
    expect(
      normalizeNarrativeString(
        'The skill was correctly invoked and followed.',
        '当前窗口显示该技能被正确调用并按预期执行。',
        'zh',
      )
    ).toBe('当前窗口显示该技能被正确调用并按预期执行。');
  });

  it('keeps chinese or mixed chinese narratives in zh mode', () => {
    expect(needsNarrativeFallback('当前窗口显示 skill 使用正确，无需优化。', 'zh')).toBe(false);
    expect(
      normalizeNarrativeString(
        '当前窗口显示 skill 使用正确，无需优化。',
        'fallback',
        'zh',
      )
    ).toBe('当前窗口显示 skill 使用正确，无需优化。');
  });

  it('falls back when zh narratives contain a chinese prefix plus a long english explanation', () => {
    expect(
      needsNarrativeFallback(
        '窗口分析结论：The skill was correctly invoked and followed, with the assistant performing root cause investigation as expected.',
        'zh',
      )
    ).toBe(true);
    expect(
      normalizeNarrativeString(
        '窗口分析结论：The skill was correctly invoked and followed, with the assistant performing root cause investigation as expected.',
        '当前窗口显示该技能被正确调用并按预期执行，未发现需要优化的设计问题。',
        'zh',
      )
    ).toBe('当前窗口显示该技能被正确调用并按预期执行，未发现需要优化的设计问题。');
  });

  it('filters english-only arrays in zh mode back to localized defaults', () => {
    expect(
      normalizeNarrativeArray(
        ['The model saw no optimization opportunity.'],
        ['当前没有足够证据支持优化。'],
        'zh',
      )
    ).toEqual(['当前没有足够证据支持优化。']);
  });
});
