import { resolve } from 'node:path';
import { extractSkillRefs, extractSkillRefsFromSources } from '../../../utils/skill-refs.js';
import { createChildLogger } from '../../../utils/logger.js';
import type { PreprocessedTrace, Trace, TraceStatus } from '../../../types/index.js';

const logger = createChildLogger('codex-event-preprocessor');

export interface CodexRawEvent {
  timestamp: string;
  type: 'session_meta' | 'event_msg' | 'response_item' | 'turn_context' | 'compacted';
  payload: Record<string, unknown>;
}

export class CodexEventPreprocessor {
  private readonly maxMessageChars: number;
  private readonly maxStructuredPreviewChars: number;
  private readonly maxSkillReferenceScanChars: number;

  constructor(
    private readonly options: {
      sessionProjectPaths: Map<string, string>;
      getNextTurnId: () => string;
      maxMessageChars?: number;
      maxStructuredPreviewChars?: number;
      maxSkillReferenceScanChars?: number;
    }
  ) {
    this.maxMessageChars = options.maxMessageChars ?? 8000;
    this.maxStructuredPreviewChars = options.maxStructuredPreviewChars ?? 4000;
    this.maxSkillReferenceScanChars = options.maxSkillReferenceScanChars ?? 16000;
  }

  preprocessEvent(sessionId: string, event: CodexRawEvent): PreprocessedTrace | null {
    const turnId = this.options.getNextTurnId();

    switch (event.type) {
      case 'session_meta': {
        this.captureSessionProjectPath(sessionId, event);
        const baseInstructionsRaw = event.payload.base_instructions;
        const baseInstructions =
          typeof baseInstructionsRaw === 'string'
            ? baseInstructionsRaw
            : (baseInstructionsRaw as { text?: string })?.text || '';
        const activatedSkills = this.extractSkillReferences(
          baseInstructions.slice(0, this.maxSkillReferenceScanChars)
        );

        return {
          sessionId,
          turnId,
          timestamp: event.timestamp,
          eventType: 'status',
          content: {
            activatedSkills,
          },
          skillRefs: activatedSkills,
          metadata: {
            projectPath: this.options.sessionProjectPaths.get(sessionId),
            originator: event.payload.originator,
            source: event.payload.source,
          },
        };
      }

      case 'response_item':
        return this.preprocessResponseItem(sessionId, turnId, event);

      case 'event_msg':
      case 'turn_context':
      case 'compacted':
      default:
        return null;
    }
  }

  preprocessResponseItem(
    sessionId: string,
    turnId: string,
    event: CodexRawEvent
  ): PreprocessedTrace | null {
    const payload = event.payload;
    const itemType = payload?.type as string;

    switch (itemType) {
      case 'message': {
        const role = payload.role as string;
        if (role !== 'user' && role !== 'assistant') {
          return null;
        }

        const fullContent = this.extractMessageContent(payload.content, this.maxMessageChars * 2);
        const skillRefs = this.extractSkillReferences(
          fullContent.slice(0, this.maxSkillReferenceScanChars)
        );
        const content = this.truncateText(fullContent, this.maxMessageChars);

        return {
          sessionId,
          turnId,
          timestamp: event.timestamp,
          eventType: role === 'user' ? 'user_input' : 'assistant_output',
          content,
          skillRefs,
        };
      }

      case 'function_call': {
        const toolName =
          (payload.name as string) ||
          ((payload.function as Record<string, unknown>)?.name as string);
        const rawArgs =
          payload.arguments ?? (payload.function as Record<string, unknown>)?.arguments;
        let args: Record<string, unknown> = {};

        if (typeof rawArgs === 'string') {
          try {
            args = JSON.parse(rawArgs) as Record<string, unknown>;
          } catch {
            args = { raw: rawArgs };
          }
        } else if (rawArgs && typeof rawArgs === 'object') {
          args = rawArgs as Record<string, unknown>;
        }

        const skillRefs = extractSkillRefsFromSources([toolName, args]);
        if (skillRefs.length > 0) {
          logger.debug('Extracted skill refs from Codex tool call', {
            sessionId,
            turnId,
            toolName,
            skillRefs,
          });
        }

        return {
          sessionId,
          turnId,
          timestamp: event.timestamp,
          eventType: 'tool_call',
          skillRefs,
          content: {
            tool: toolName,
            args: this.compactStructuredValue(args),
          },
          metadata: {
            callId: payload.call_id,
          },
        };
      }

      case 'function_call_output':
        return {
          sessionId,
          turnId,
          timestamp: event.timestamp,
          eventType: 'tool_result',
          content: {
            callId: payload.call_id,
            output: this.compactStructuredValue(payload.output),
          },
        };

      default:
        return null;
    }
  }

  convertToStandardTrace(preprocessed: PreprocessedTrace): Trace {
    const projectPath =
      (typeof preprocessed.metadata?.projectPath === 'string'
        ? preprocessed.metadata.projectPath
        : this.options.sessionProjectPaths.get(preprocessed.sessionId)) ?? undefined;
    const metadata =
      projectPath || preprocessed.metadata
        ? {
            ...(preprocessed.metadata ?? {}),
            ...(projectPath ? { projectPath } : {}),
          }
        : undefined;
    const base = {
      trace_id: `${preprocessed.sessionId}_${preprocessed.turnId}`,
      runtime: 'codex' as const,
      session_id: preprocessed.sessionId,
      turn_id: preprocessed.turnId,
      event_type: preprocessed.eventType,
      timestamp: preprocessed.timestamp,
      skill_refs: preprocessed.skillRefs,
      status: 'success' as TraceStatus,
      metadata,
    };

    switch (preprocessed.eventType) {
      case 'user_input':
        return {
          ...base,
          user_input: preprocessed.content as string,
        };
      case 'assistant_output':
        return {
          ...base,
          assistant_output: preprocessed.content as string,
        };
      case 'tool_call': {
        const toolContent = preprocessed.content as { tool: string; args: Record<string, unknown> };
        return {
          ...base,
          tool_name: toolContent.tool,
          tool_args: toolContent.args,
        };
      }
      case 'tool_result': {
        const resultContent = preprocessed.content as { output: Record<string, unknown> };
        return {
          ...base,
          tool_result: resultContent.output,
        };
      }
      case 'file_change':
        return {
          ...base,
          files_changed: preprocessed.content as string[],
        };
      case 'status':
      default:
        return base;
    }
  }

  captureSessionProjectPath(sessionId: string, event: CodexRawEvent): void {
    const projectPath = this.extractProjectPathFromPayload(event.payload);
    if (!projectPath) {
      return;
    }
    this.options.sessionProjectPaths.set(sessionId, projectPath);
  }

  extractProjectPathFromPayload(payload: Record<string, unknown>): string | null {
    const directCwd = payload.cwd;
    if (typeof directCwd === 'string' && directCwd.trim()) {
      return resolve(directCwd);
    }

    const nestedContext = payload.context;
    if (nestedContext && typeof nestedContext === 'object') {
      const nestedCwd = (nestedContext as Record<string, unknown>).cwd;
      if (typeof nestedCwd === 'string' && nestedCwd.trim()) {
        return resolve(nestedCwd);
      }
    }

    return null;
  }

  peekRawEventType(line: string): string | null {
    const match = line.slice(0, 256).match(/"type":"([^"]+)"/);
    return match ? match[1] : null;
  }

  private extractSkillReferences(text: string): string[] {
    return extractSkillRefs(text);
  }

  private extractMessageContent(content: unknown, maxChars = Number.POSITIVE_INFINITY): string {
    if (typeof content === 'string') {
      return this.truncateText(content, maxChars);
    }

    if (Array.isArray(content)) {
      const textParts: string[] = [];
      let totalLength = 0;
      for (const part of content as Array<string | { type?: string; text?: unknown }>) {
        if (typeof part === 'string') {
          const next = this.truncateText(part, Math.max(maxChars - totalLength, 0));
          textParts.push(next);
          totalLength += next.length;
        } else if (
          (part?.type === 'input_text' || part?.type === 'output_text' || part?.type === 'text') &&
          typeof part.text === 'string'
        ) {
          const next = this.truncateText(part.text, Math.max(maxChars - totalLength, 0));
          textParts.push(next);
          totalLength += next.length;
        }

        if (totalLength >= maxChars) {
          break;
        }
      }
      return textParts.join('\n');
    }

    return this.truncateText(JSON.stringify(content), maxChars);
  }

  private truncateText(text: string, maxChars: number): string {
    if (text.length <= maxChars) {
      return text;
    }
    return text.slice(0, maxChars) + '…';
  }

  private compactStructuredValue(value: unknown): Record<string, unknown> {
    if (typeof value === 'string') {
      const preview = this.truncateText(value, this.maxStructuredPreviewChars);
      return preview ? { preview, truncated: value.length > this.maxStructuredPreviewChars } : {};
    }
    if (!value || typeof value !== 'object') {
      return { value };
    }

    if (Array.isArray(value)) {
      return {
        kind: 'array',
        itemCount: value.length,
        preview: value.slice(0, 3).map((item) => this.compactPrimitive(item)),
        truncated: value.length > 3,
      };
    }

    const objectValue = value as Record<string, unknown>;
    const entries = Object.entries(objectValue);
    const previewEntries = entries
      .slice(0, 8)
      .map(([key, item]) => [key, this.compactPrimitive(item)]);
    const previewObject = Object.fromEntries(previewEntries);
    const base = {
      kind: 'object',
      keyCount: entries.length,
      preview: previewObject,
      truncated: entries.length > previewEntries.length,
    };

    try {
      const previewJson = JSON.stringify(base);
      if (previewJson.length <= this.maxStructuredPreviewChars) {
        return base;
      }
      return { ...base, preview: this.truncateText(previewJson, this.maxStructuredPreviewChars) };
    } catch {
      return base;
    }
  }

  private compactPrimitive(value: unknown): unknown {
    if (typeof value === 'string') {
      return this.truncateText(value, 240);
    }
    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint' ||
      value === null
    ) {
      return value;
    }
    if (typeof value === 'undefined') {
      return 'undefined';
    }
    if (typeof value === 'symbol') {
      return value.toString();
    }
    if (typeof value === 'function') {
      return `[function:${value.name || 'anonymous'}]`;
    }
    if (Array.isArray(value)) {
      return `[array:${value.length}]`;
    }
    if (value && typeof value === 'object') {
      return `[object:${Object.keys(value as Record<string, unknown>)
        .slice(0, 5)
        .join(',')}]`;
    }
    return '[unknown]';
  }
}
