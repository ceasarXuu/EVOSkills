import type { Language } from '../../dashboard/i18n.js';
import type {
  ChangeType,
  EvaluationResult,
  WindowAnalysisDecision,
  WindowAnalysisHint,
} from '../../types/index.js';
import type { SkillCallWindow } from '../skill-call-window/index.js';
import { ALLOWED_CHANGE_TYPES } from './constants.js';
import { buildReasonFallback } from './localization.js';
import { buildFallbackHint } from './prompt-builder.js';

export interface AnalyzerResponsePayload {
  decision?: unknown;
  reason?: unknown;
  confidence?: unknown;
  next_window_hint?: unknown;
  change_type?: unknown;
  target_section?: unknown;
  pattern?: unknown;
  evidence?: unknown;
}

export interface ParsedSkillCallAnalyzerPayload {
  decision: WindowAnalysisDecision;
  hint: WindowAnalysisHint;
  rawReason: string;
  fallbackReason: string;
  confidence: number;
  evidence: string[];
  evaluation: EvaluationResult;
}

function buildRawResponseExcerpt(raw: string): string {
  const normalized = String(raw || '').trim();
  if (!normalized) return '';
  return normalized.length <= 1200 ? normalized : `${normalized.slice(0, 1200)}...`;
}

function normalizeDecision(value: unknown): WindowAnalysisDecision {
  switch (value) {
    case 'no_optimization':
    case 'apply_optimization':
      return value;
    default:
      return 'need_more_context';
  }
}

function normalizeChangeType(value: unknown): ChangeType | undefined {
  if (typeof value !== 'string') return undefined;
  return ALLOWED_CHANGE_TYPES.includes(value as ChangeType) ? (value as ChangeType) : undefined;
}

function normalizeConfidence(value: unknown): number {
  return typeof value === 'number' && value >= 0 && value <= 1 ? value : 0;
}

function normalizeEvidence(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function normalizeHint(value: unknown, fallback: WindowAnalysisHint): WindowAnalysisHint {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    suggestedTraceDelta:
      typeof source.suggested_trace_delta === 'number'
        ? Math.max(1, Math.floor(source.suggested_trace_delta))
        : fallback.suggestedTraceDelta,
    suggestedTurnDelta:
      typeof source.suggested_turn_delta === 'number'
        ? Math.max(1, Math.floor(source.suggested_turn_delta))
        : fallback.suggestedTurnDelta,
    waitForEventTypes: Array.isArray(source.wait_for_event_types)
      ? source.wait_for_event_types.map((item) => String(item))
      : fallback.waitForEventTypes,
    mode:
      source.mode === 'event_driven' || source.mode === 'count_driven'
        ? source.mode
        : fallback.mode,
  };
}

function buildEvaluation(
  payload: AnalyzerResponsePayload,
  window: SkillCallWindow,
  reason: string,
  evidence: string[],
): EvaluationResult {
  const targetSection = typeof payload.target_section === 'string' && payload.target_section.trim()
    ? payload.target_section.trim()
    : undefined;
  const pattern = typeof payload.pattern === 'string' && payload.pattern.trim()
    ? payload.pattern.trim()
    : undefined;

  return {
    should_patch: true,
    change_type: normalizeChangeType(payload.change_type),
    reason,
    source_sessions: [window.sessionId],
    confidence: normalizeConfidence(payload.confidence),
    target_section: targetSection,
    rule_name: 'llm_window_analysis',
    patch_context: {
      pattern,
      reason: evidence.length > 0 ? evidence.join(' | ') : reason,
      section: targetSection,
    },
  };
}

export function parseSkillCallAnalyzerPayload(
  payload: AnalyzerResponsePayload,
  window: SkillCallWindow,
  lang: Language,
): ParsedSkillCallAnalyzerPayload {
  const decision = normalizeDecision(payload.decision);
  const hint = normalizeHint(payload.next_window_hint, buildFallbackHint(window));
  const changeType = normalizeChangeType(payload.change_type);
  const targetSection = typeof payload.target_section === 'string' && payload.target_section.trim()
    ? payload.target_section.trim()
    : undefined;
  const fallbackReason = buildReasonFallback(decision, lang, {
    changeType,
    targetSection,
  });
  const rawReason = typeof payload.reason === 'string' && payload.reason.trim()
    ? payload.reason.trim()
    : fallbackReason;
  const evidence = normalizeEvidence(payload.evidence);
  const confidence = normalizeConfidence(payload.confidence);

  const evaluation = decision === 'apply_optimization'
    ? buildEvaluation(payload, window, rawReason, evidence)
    : {
        should_patch: false,
        reason: rawReason,
        source_sessions: [window.sessionId],
        confidence,
        rule_name: 'llm_window_analysis',
      };

  return {
    decision,
    hint,
    rawReason,
    fallbackReason,
    confidence,
    evidence,
    evaluation,
  };
}

export function describeSkillCallAnalysisFailure(
  rawError: string,
  lang: Language,
  options?: {
    rawResponse?: string | null;
  },
): { errorCode: string; userMessage: string; technicalDetail: string } {
  const isZh = lang === 'zh';
  const normalized = String(rawError || '').trim();
  const rawResponseExcerpt = buildRawResponseExcerpt(options?.rawResponse || '');

  if (normalized === 'provider_not_configured') {
    return {
      errorCode: 'provider_not_configured',
      userMessage: isZh
        ? '当前项目没有可用的模型服务配置，所以这轮分析没有开始。'
        : 'This analysis did not start because no model provider is configured for the project.',
      technicalDetail: normalized,
    };
  }

  if (normalized === 'invalid_analysis_json') {
    const technicalDetail = rawResponseExcerpt
      ? [normalized, 'Raw model response excerpt:', rawResponseExcerpt].join('\n')
      : normalized;
    return {
      errorCode: 'invalid_analysis_json',
      userMessage: isZh
        ? '模型返回了内容，但格式不符合系统要求，所以这轮分析结果无法解析。'
        : 'The model replied, but the response did not match the required JSON format, so the analysis could not be parsed.',
      technicalDetail,
    };
  }

  if (normalized.includes('Empty content in LLM response')) {
    return {
      errorCode: 'empty_llm_response',
      userMessage: isZh
        ? '模型接口返回了空内容，所以这轮分析没有拿到可用结果。'
        : 'The model API returned an empty response, so this analysis produced no usable result.',
      technicalDetail: normalized,
    };
  }

  if (normalized.toLowerCase().includes('timeout')) {
    return {
      errorCode: 'analysis_timeout',
      userMessage: isZh
        ? '分析请求超时了，所以这轮分析没有完成。'
        : 'The analysis request timed out before a usable result was returned.',
      technicalDetail: normalized,
    };
  }

  if (normalized.startsWith('LLM API error:')) {
    return {
      errorCode: 'provider_request_failed',
      userMessage: isZh
        ? '模型服务调用失败，所以这轮分析没有完成。'
        : 'The model provider request failed, so this analysis did not complete.',
      technicalDetail: normalized,
    };
  }

  return {
    errorCode: 'analysis_runtime_error',
    userMessage: isZh
      ? '分析链路执行时发生异常，所以这轮分析没有产生可用结果。'
      : 'The analysis pipeline hit an unexpected error before it could produce a usable result.',
    technicalDetail: normalized || (isZh ? '未知错误' : 'unknown error'),
  };
}
