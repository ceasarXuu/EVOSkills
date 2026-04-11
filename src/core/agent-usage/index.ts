import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { NDJSONWriter } from '../../storage/ndjson.js';
import { createChildLogger } from '../../utils/logger.js';
import type { AgentUsageRecord, AgentUsageScope } from '../../types/index.js';

const logger = createChildLogger('agent-usage');

export interface AgentUsageSummary {
  updatedAt: string;
  scope: 'ornn_agent';
  callCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  byModel: Record<string, {
    callCount: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }>;
  byScope: Record<AgentUsageScope, {
    callCount: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }>;
}

function emptySummary(): AgentUsageSummary {
  return {
    updatedAt: new Date().toISOString(),
    scope: 'ornn_agent',
    callCount: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    byModel: {},
    byScope: {
      decision_explainer: {
        callCount: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      skill_call_analyzer: {
        callCount: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      readiness_probe: {
        callCount: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    },
  };
}

export function readAgentUsageSummary(projectPath: string): AgentUsageSummary | null {
  const summaryPath = join(projectPath, '.ornn', 'state', 'agent-usage-summary.json');
  if (!existsSync(summaryPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(summaryPath, 'utf-8')) as Partial<AgentUsageSummary>;
    const summary = emptySummary();
    summary.updatedAt = typeof parsed.updatedAt === 'string' ? parsed.updatedAt : summary.updatedAt;
    summary.callCount = typeof parsed.callCount === 'number' ? parsed.callCount : 0;
    summary.promptTokens = typeof parsed.promptTokens === 'number' ? parsed.promptTokens : 0;
    summary.completionTokens = typeof parsed.completionTokens === 'number' ? parsed.completionTokens : 0;
    summary.totalTokens = typeof parsed.totalTokens === 'number' ? parsed.totalTokens : 0;
    summary.byModel = parsed.byModel && typeof parsed.byModel === 'object'
      ? parsed.byModel as AgentUsageSummary['byModel']
      : {};

    const rawByScope = parsed.byScope && typeof parsed.byScope === 'object'
      ? parsed.byScope as Partial<AgentUsageSummary['byScope']>
      : {};
    for (const scope of ['decision_explainer', 'skill_call_analyzer', 'readiness_probe'] as const) {
      const item = rawByScope[scope];
      if (!item) continue;
      summary.byScope[scope] = {
        callCount: typeof item.callCount === 'number' ? item.callCount : 0,
        promptTokens: typeof item.promptTokens === 'number' ? item.promptTokens : 0,
        completionTokens: typeof item.completionTokens === 'number' ? item.completionTokens : 0,
        totalTokens: typeof item.totalTokens === 'number' ? item.totalTokens : 0,
      };
    }
    return summary;
  } catch (error) {
    logger.warn('Failed to read agent usage summary', {
      projectPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function writeAgentUsageSummary(projectPath: string, summary: AgentUsageSummary): void {
  const stateDir = join(projectPath, '.ornn', 'state');
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, 'agent-usage-summary.json'), JSON.stringify(summary, null, 2), 'utf-8');
}

export function recordAgentUsage(
  projectPath: string,
  record: Omit<AgentUsageRecord, 'id' | 'timestamp'>
): void {
  const writer = new NDJSONWriter<AgentUsageRecord>(join(projectPath, '.ornn', 'state', 'agent-usage.ndjson'));
  writer.append({
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...record,
  });

  const summary = readAgentUsageSummary(projectPath) ?? emptySummary();
  summary.updatedAt = new Date().toISOString();
  summary.callCount += 1;
  summary.promptTokens += record.promptTokens;
  summary.completionTokens += record.completionTokens;
  summary.totalTokens += record.totalTokens;

  if (!summary.byModel[record.model]) {
    summary.byModel[record.model] = {
      callCount: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };
  }
  summary.byModel[record.model].callCount += 1;
  summary.byModel[record.model].promptTokens += record.promptTokens;
  summary.byModel[record.model].completionTokens += record.completionTokens;
  summary.byModel[record.model].totalTokens += record.totalTokens;

  if (!summary.byScope[record.scope]) {
    summary.byScope[record.scope] = {
      callCount: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };
  }
  summary.byScope[record.scope].callCount += 1;
  summary.byScope[record.scope].promptTokens += record.promptTokens;
  summary.byScope[record.scope].completionTokens += record.completionTokens;
  summary.byScope[record.scope].totalTokens += record.totalTokens;

  writeAgentUsageSummary(projectPath, summary);

  logger.debug('Agent usage recorded', {
    projectPath,
    scope: record.scope,
    eventId: record.eventId,
    skillId: record.skillId,
    model: record.model,
    totalTokens: record.totalTokens,
    cumulativeCalls: summary.callCount,
  });
}
