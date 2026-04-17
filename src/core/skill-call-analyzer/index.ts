import { createChildLogger } from '../../utils/logger.js';
import { createLiteLLMClient } from '../../llm/litellm-client.js';
import { readDashboardConfig } from '../../config/manager.js';
import { buildAgentUsageModelId, recordAgentUsage } from '../agent-usage/index.js';
import { readProjectLanguage } from '../../dashboard/language-state.js';
import {
  needsNarrativeFallback,
  normalizeNarrativeArray,
  normalizeNarrativeString,
} from '../llm-localization/index.js';
import { extractJsonObject } from '../../utils/json-response.js';
import type { EvaluationResult, WindowAnalysisHint } from '../../types/index.js';
import type { SkillCallWindow } from '../skill-call-window/index.js';
import { SKILL_CALL_ANALYZER_PROMPT_VERSION } from './constants.js';
import { buildSkillCallAnalyzerPrompt } from './prompt-builder.js';
import {
  describeSkillCallAnalysisFailure,
  parseSkillCallAnalyzerPayload,
  type AnalyzerResponsePayload,
} from './response-parser.js';

const logger = createChildLogger('skill-call-analyzer');

export interface SkillCallAnalysisResult {
  success: boolean;
  decision?: 'no_optimization' | 'apply_optimization' | 'need_more_context';
  evaluation?: EvaluationResult;
  model: string;
  error?: string;
  errorCode?: string;
  userMessage?: string;
  technicalDetail?: string;
  nextWindowHint?: WindowAnalysisHint;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class SkillCallAnalyzer {
  async analyzeWindow(
    projectPath: string,
    window: SkillCallWindow,
    skillContent: string
  ): Promise<SkillCallAnalysisResult> {
    const lang = await readProjectLanguage(projectPath, 'en');
    const config = await readDashboardConfig(projectPath);
    const activeProvider = config.providers[0];
    const promptSource = config.promptSources?.skillCallAnalyzer;
    const promptOverride = config.promptOverrides?.skillCallAnalyzer || '';

    if (!activeProvider || !activeProvider.apiKey) {
      const failure = describeSkillCallAnalysisFailure('provider_not_configured', lang);
      logger.warn('Skill call analysis blocked: provider not configured', {
        projectPath,
        windowId: window.windowId,
        skillId: window.skillId,
      });
      return {
        success: false,
        model: 'none',
        error: failure.errorCode,
        errorCode: failure.errorCode,
        userMessage: failure.userMessage,
        technicalDetail: failure.technicalDetail,
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
      };
    }

    if (promptSource === 'custom' && promptOverride.trim()) {
      logger.info('Applying skill call analyzer prompt override', {
        projectPath,
        windowId: window.windowId,
        skillId: window.skillId,
        overrideLength: promptOverride.trim().length,
      });
    }

    const client = createLiteLLMClient({
      provider: activeProvider.provider,
      modelName: activeProvider.modelName,
      apiKey: activeProvider.apiKey,
      maxTokens: 1600,
    });
    const prompt = buildSkillCallAnalyzerPrompt(
      window,
      skillContent,
      lang,
      promptOverride,
      promptSource
    );
    const model = buildAgentUsageModelId(activeProvider.provider, activeProvider.modelName);
    const started = Date.now();

    try {
      logger.debug('Prepared skill call analysis prompt', {
        projectPath,
        windowId: window.windowId,
        skillId: window.skillId,
        promptVersion: SKILL_CALL_ANALYZER_PROMPT_VERSION,
        lang,
        traceCount: window.traces.length,
        systemPromptChars: prompt.systemPrompt.length,
        userPromptChars: prompt.userPrompt.length,
      });
      const raw = await client.completion({
        prompt: prompt.userPrompt,
        systemPrompt: prompt.systemPrompt,
        temperature: 0.1,
        maxTokens: 1600,
        timeout: 45000,
        responseFormat: 'json_object',
      });
      const usage = client.getTokenUsage();
      recordAgentUsage(projectPath, {
        scope: 'skill_call_analyzer',
        eventId: window.windowId,
        skillId: window.skillId,
        episodeId: window.episodeId ?? null,
        triggerTraceId: window.triggerTraceId ?? null,
        windowId: window.windowId,
        model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        durationMs: Date.now() - started,
      });
      const jsonText = extractJsonObject(raw);
      if (!jsonText) {
        const failure = describeSkillCallAnalysisFailure('invalid_analysis_json', lang, { rawResponse: raw });
        logger.warn('Skill call analysis failed to return JSON', {
          projectPath,
          windowId: window.windowId,
          skillId: window.skillId,
          model,
          rawResponseExcerpt: raw.slice(0, 1200),
        });
        return {
          success: false,
          model,
          error: failure.errorCode,
          errorCode: failure.errorCode,
          userMessage: failure.userMessage,
          technicalDetail: failure.technicalDetail,
          tokenUsage: usage,
        };
      }

      const payload = JSON.parse(jsonText) as AnalyzerResponsePayload;
      const parsed = parseSkillCallAnalyzerPayload(payload, window, lang);
      const reason = normalizeNarrativeString(parsed.rawReason, parsed.fallbackReason, lang);
      const evidence = normalizeNarrativeArray(parsed.evidence, [], lang);

      if (needsNarrativeFallback(parsed.rawReason, lang)) {
        logger.warn('Skill call analyzer returned narrative in the wrong language; using localized fallback', {
          projectPath,
          windowId: window.windowId,
          skillId: window.skillId,
          lang,
          decision: parsed.decision,
          rawReason: parsed.rawReason,
        });
      }

      const evaluation = parsed.decision === 'apply_optimization'
        ? {
            ...parsed.evaluation,
            reason,
            patch_context: {
              ...parsed.evaluation.patch_context,
              reason: evidence.length > 0 ? evidence.join(' | ') : reason,
            },
          }
        : {
            ...parsed.evaluation,
            reason,
          };

      logger.info('Skill call window analysis completed', {
        projectPath,
        windowId: window.windowId,
        skillId: window.skillId,
        model,
        decision: parsed.decision,
        changeType: evaluation.change_type ?? null,
        confidence: evaluation.confidence,
        totalTokens: usage.totalTokens,
      });

      return {
        success: true,
        decision: parsed.decision,
        evaluation,
        model,
        userMessage: reason,
        nextWindowHint: parsed.hint,
        tokenUsage: usage,
      };
    } catch (error) {
      const usage = client.getTokenUsage();
      const rawMessage = error instanceof Error ? error.message : String(error);
      const failure = describeSkillCallAnalysisFailure(rawMessage, lang);
      logger.error('Skill call analysis failed', {
        projectPath,
        windowId: window.windowId,
        skillId: window.skillId,
        model,
        error: rawMessage,
      });
      return {
        success: false,
        model,
        error: failure.errorCode,
        errorCode: failure.errorCode,
        userMessage: failure.userMessage,
        technicalDetail: failure.technicalDetail,
        tokenUsage: usage,
      };
    }
  }
}

export function createSkillCallAnalyzer(): SkillCallAnalyzer {
  return new SkillCallAnalyzer();
}
