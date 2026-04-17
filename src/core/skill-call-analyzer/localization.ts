import type { Language } from '../../dashboard/i18n.js';
import type { ChangeType, WindowAnalysisDecision } from '../../types/index.js';

export function describeChangeType(changeType: ChangeType, lang: Language): string {
  if (lang !== 'zh') return changeType;

  switch (changeType) {
    case 'append_context':
      return '补充上下文';
    case 'tighten_trigger':
      return '收紧触发条件';
    case 'add_fallback':
      return '增加兜底策略';
    case 'prune_noise':
      return '裁剪噪声';
    case 'rewrite_section':
      return '重写段落';
    default:
      return changeType;
  }
}

export function buildReasonFallback(
  decision: WindowAnalysisDecision,
  lang: Language,
  options?: {
    changeType?: ChangeType;
    targetSection?: string;
  },
): string {
  if (lang === 'zh') {
    if (decision === 'apply_optimization') {
      const targetSection = options?.targetSection?.trim() || '相关段落';
      if (options?.changeType) {
        return `当前窗口已发现稳定改进信号，建议执行优化，并按“${describeChangeType(options.changeType, lang)}”方式修改“${targetSection}”。`;
      }
      return '当前窗口已发现稳定改进信号，建议执行优化。';
    }
    if (decision === 'need_more_context') {
      return '当前窗口证据仍不足，暂时无法下结论，需要继续观察更多上下文。';
    }
    return '当前窗口显示该技能被正确调用并按预期执行，未发现需要优化的设计问题。';
  }

  if (decision === 'apply_optimization') {
    const targetSection = options?.targetSection?.trim() || 'the relevant section';
    if (options?.changeType) {
      return `The current window shows a stable optimization signal; apply ${options.changeType} to ${targetSection}.`;
    }
    return 'The current window shows a stable optimization signal and recommends applying an optimization.';
  }
  if (decision === 'need_more_context') {
    return 'The current window is still inconclusive and needs more context.';
  }
  return 'The current window indicates the skill was invoked correctly and does not need optimization.';
}
