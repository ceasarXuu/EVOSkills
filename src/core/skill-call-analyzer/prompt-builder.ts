import { appendProjectPromptOverride } from '../prompt-overrides.js';
import { buildTraceTimelineText } from '../trace-summary/index.js';
import type { Language } from '../../dashboard/i18n.js';
import type { WindowAnalysisHint } from '../../types/index.js';
import type { SkillCallWindow } from '../skill-call-window/index.js';
import { ALLOWED_CHANGE_TYPES } from './constants.js';

export function buildFallbackHint(window: SkillCallWindow): WindowAnalysisHint {
  const traceCount = Math.max(window.traces.length, 1);
  return {
    suggestedTraceDelta: Math.max(6, Math.ceil(traceCount * 0.4)),
    suggestedTurnDelta: 2,
    waitForEventTypes: [],
    mode: 'count_driven',
  };
}

function countExplicitSkillMentions(window: SkillCallWindow): number {
  const normalizedSkillId = window.skillId.toLowerCase();

  return window.traces.reduce((count, trace) => {
    const mentionedInRefs = trace.skill_refs?.some((ref) => {
      const normalizedRef = String(ref || '').toLowerCase();
      return normalizedRef === normalizedSkillId || normalizedRef.startsWith(`${normalizedSkillId}@`);
    }) ?? false;
    const mentionedInUser = trace.user_input?.toLowerCase().includes(normalizedSkillId) ?? false;
    const mentionedInAssistant = trace.assistant_output?.toLowerCase().includes(normalizedSkillId) ?? false;
    return count + (mentionedInRefs || mentionedInUser || mentionedInAssistant ? 1 : 0);
  }, 0);
}

function buildWindowSnapshot(window: SkillCallWindow, lang: Language): string[] {
  const failureCount = window.traces.filter((trace) => trace.status === 'failure').length;
  const toolFailureCount = window.traces.filter((trace) =>
    trace.event_type === 'tool_result' && trace.status === 'failure'
  ).length;
  const retryCount = window.traces.filter((trace) =>
    trace.event_type === 'retry' || trace.status === 'retry'
  ).length;
  const assistantOutputCount = window.traces.filter((trace) =>
    typeof trace.assistant_output === 'string' && trace.assistant_output.trim().length > 0
  ).length;
  const fileChangeCount = window.traces.filter((trace) =>
    trace.event_type === 'file_change' || (trace.files_changed?.length ?? 0) > 0
  ).length;
  const explicitSkillMentions = countExplicitSkillMentions(window);

  if (lang === 'zh') {
    return [
      `- 显式 skill 提及次数: ${explicitSkillMentions}`,
      `- 失败事件数: ${failureCount}`,
      `- 工具失败数: ${toolFailureCount}`,
      `- 重试事件数: ${retryCount}`,
      `- 助手输出事件数: ${assistantOutputCount}`,
      `- 文件变更事件数: ${fileChangeCount}`,
    ];
  }

  return [
    `- Explicit skill mentions: ${explicitSkillMentions}`,
    `- Failure events: ${failureCount}`,
    `- Tool failures: ${toolFailureCount}`,
    `- Retry events: ${retryCount}`,
    `- Assistant output events: ${assistantOutputCount}`,
    `- File change events: ${fileChangeCount}`,
  ];
}

export function buildSkillCallAnalyzerPrompt(
  window: SkillCallWindow,
  skillContent: string,
  lang: Language,
  promptOverride: string,
): { systemPrompt: string; userPrompt: string } {
  const isZh = lang === 'zh';
  const baseSystemPrompt = isZh
    ? [
        '你是 Ornn 的技能调用窗口分析器。',
        '你的任务是基于当前窗口的完整上下文，返回唯一一个三元决策。',
        '允许的 decision 只有: no_optimization, apply_optimization, need_more_context。',
        '先按下面顺序做判断。',
        '第一步：确认当前窗口里是否真的存在 skill 相关信号。skill 相关信号包括：用户显式提到该 skill、assistant 明确按该 skill 的方法推进、失败模式与该 skill 的指令直接相关。',
        '第二步：判断观察到的问题是否真的由 skill 设计造成，而不是宿主故障、工具故障、权限限制、网络/环境异常、外部服务波动、信息缺失、用户中途改目标或单次偶发失误。',
        '第三步：如果怀疑需要优化，再判断证据是否已经稳定到足以支持可执行修改，并且能落到允许的 change_type / target_section。',
        '决策规则：',
        '- 返回 no_optimization：当窗口足以说明 skill 被正确调用并按预期执行；或观察到的问题不属于 skill 设计；或只有宿主/工具/环境问题，没有证据表明 skill 本身需要修改。',
        '- 返回 need_more_context：当你怀疑 skill 可能有问题，但证据、归因或定位还不稳定；或只看到一次孤立失败；或缺少失败前后的关键上下文；或虽然看到了问题，但还不能可靠给出 change_type / target_section。',
        '- 只有同时满足以下条件，才允许返回 apply_optimization：',
        '  1. 已观察到至少一个清晰且可归因于 skill 的缺口、歧义或遗漏；',
        '  2. 这个问题不是主要由宿主故障、工具故障、权限限制、网络/环境异常造成；',
        '  3. 当前窗口已经能稳定说明“改 skill 会改善结果”；',
        '  4. 你能给出允许的 change_type，并在需要时定位到 target_section；',
        '  5. evidence 能提供至少 2 条来自时间线的事实。',
        '如果问题主要来自宿主故障、工具故障、权限限制、网络/环境异常，默认不能返回 apply_optimization。',
        'need_more_context 适用于“怀疑 skill 有问题，但证据、归因或定位还不稳定”。',
        '不要用基于关键词的机械判断，必须结合完整时间线语义和前后因果。',
        '不要把“用户尚未执行建议”“只尝试了一次”“窗口在中途结束”直接当成 skill 失败。',
        '只返回 JSON，字段固定为 decision, reason, confidence, next_window_hint, change_type, target_section, pattern, evidence。',
        `当 decision=apply_optimization 时，change_type 只能是: ${ALLOWED_CHANGE_TYPES.join(', ')}。`,
        '当 decision!=apply_optimization 时，change_type 和 target_section 必须为 null。',
        '当 decision=need_more_context 时，必须提供 next_window_hint，并说明建议继续积累 trace 还是等待特定事件。',
        'confidence 必须是 0 到 1 之间的数字。',
        '当 decision=apply_optimization 时，evidence 至少提供 2 条；其他 decision 也应尽量提供简短事实要点。',
        'evidence 必须是从时间线摘出的简短事实要点，自然语言内容必须使用简体中文。',
        '如果任何自然语言字段出现英文句子，这份输出就是无效的，必须改写成简体中文后再返回。',
      ].join('\n')
    : [
        'You are Ornn\'s skill-call window analyzer.',
        'Your task is to inspect the full call window and return exactly one triage decision.',
        'Allowed decision values are: no_optimization, apply_optimization, need_more_context.',
        'Evaluate the window in order.',
        'Step 1: confirm that the window contains real skill-related signals. Skill-related signals include an explicit user mention of the skill, assistant behavior that clearly follows the skill, or a failure mode that directly conflicts with the skill instructions.',
        'Step 2: decide whether the observed problem is actually caused by skill design, rather than host failures, tool failures, permission limits, network/environment issues, external service instability, missing information, the user changing goals, or a one-off mistake.',
        'Step 3: if optimization still looks plausible, decide whether the evidence is stable enough to support an executable change and whether the fix can be mapped to an allowed change_type / target_section.',
        'Decision rules:',
        '- Return no_optimization when the window is sufficient to show that the skill was invoked correctly and behaved as expected, or when the observed issue is outside the skill, or when the evidence only shows host/tool/environment problems.',
        '- Return need_more_context when the skill may be at fault but the evidence, attribution, or edit location is still unstable; when you only saw one isolated failure; when critical before/after context is missing; or when you still cannot reliably name change_type / target_section.',
        '- Only return apply_optimization when all of the following are true:',
        '  1. You observed at least one clear gap, ambiguity, or omission attributable to the skill.',
        '  2. The issue is not primarily caused by host failures, tool failures, permission limits, or network/environment issues.',
        '  3. The current window is stable enough to support the claim that editing the skill would improve the outcome.',
        '  4. You can name an allowed change_type and, when needed, a target_section.',
        '  5. evidence can cite at least 2 factual bullets from the timeline.',
        'If the problem mainly comes from host/tool/permission/network/environment issues, you should not return apply_optimization by default.',
        'need_more_context is specifically for “the skill might be wrong, but the evidence, attribution, or patch location is not stable yet.”',
        'Do not rely on shallow keyword matching; reason over full timeline semantics and causal flow.',
        'Do not treat “the user has not tried the advice yet”, “only one attempt exists”, or “the window ended mid-investigation” as proof that the skill failed.',
        'Return only JSON with keys: decision, reason, confidence, next_window_hint, change_type, target_section, pattern, evidence.',
        `When decision=apply_optimization, change_type must be one of: ${ALLOWED_CHANGE_TYPES.join(', ')}.`,
        'When decision!=apply_optimization, change_type and target_section must be null.',
        'When decision=need_more_context, next_window_hint is required and must say whether Ornn should wait for more traces or for a specific event.',
        'confidence must be a number between 0 and 1.',
        'When decision=apply_optimization, evidence must contain at least 2 short factual bullets grounded in the timeline.',
      ].join('\n');

  const systemPrompt = appendProjectPromptOverride(baseSystemPrompt, promptOverride, lang);
  const timeline = buildTraceTimelineText(window.traces.slice(-60), lang).split('\n');
  const snapshot = buildWindowSnapshot(window, lang);

  const userPrompt = isZh
    ? [
        `Skill ID: ${window.skillId}`,
        `宿主: ${window.runtime}`,
        `窗口 ID: ${window.windowId}`,
        `开始时间: ${window.startedAt}`,
        `最后一条 Trace 时间: ${window.lastTraceAt}`,
        `Trace 数量: ${window.traces.length}`,
        '',
        '窗口摘要:',
        ...snapshot,
        '',
        '当前 Skill 内容:',
        '```markdown',
        skillContent,
        '```',
        '',
        '窗口时间线:',
        ...timeline,
        '',
        '请严格按“skill 相关性 -> 归因 -> 可执行性”的顺序判断，不要因为单次失败就直接给出 apply_optimization。',
        '请输出唯一一个三元决策：无需优化、执行优化、或等待更多上下文。',
      ].join('\n')
    : [
        `Skill ID: ${window.skillId}`,
        `Host: ${window.runtime}`,
        `Window ID: ${window.windowId}`,
        `Started At: ${window.startedAt}`,
        `Last Trace At: ${window.lastTraceAt}`,
        `Trace Count: ${window.traces.length}`,
        '',
        'Window Snapshot:',
        ...snapshot,
        '',
        'Current Skill Content:',
        '```markdown',
        skillContent,
        '```',
        '',
        'Window Timeline:',
        ...timeline,
        '',
        'Follow the sequence skill relevance -> attribution -> executability, and do not jump to apply_optimization from a single failure.',
        'Return exactly one triage decision: no optimization, apply optimization, or wait for more context.',
      ].join('\n');

  return { systemPrompt, userPrompt };
}
