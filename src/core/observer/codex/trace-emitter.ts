import { createChildLogger } from '../../../utils/logger.js';
import type { PreprocessedTrace, Trace } from '../../../types/index.js';

const logger = createChildLogger('codex-trace-emitter');

export function emitCodexPreprocessedTraces(options: {
  sessionId: string;
  traces: PreprocessedTrace[];
  convertToStandardTrace: (trace: PreprocessedTrace) => Trace;
  emitTrace: (trace: Trace) => void;
  logInfo?: (message: string, payload?: Record<string, unknown>) => void;
  logDebug?: (message: string, payload?: Record<string, unknown>) => void;
}): {
  totalTraces: number;
  typeBreakdown: Record<string, number>;
  detectedSkills: string[];
} {
  const typeCount = new Map<string, number>();
  const skillRefs = new Set<string>();

  for (const trace of options.traces) {
    typeCount.set(trace.eventType, (typeCount.get(trace.eventType) || 0) + 1);
    if (trace.skillRefs) {
      trace.skillRefs.forEach((ref) => skillRefs.add(ref));
    }

    const standardTrace = options.convertToStandardTrace(trace);
    options.emitTrace(standardTrace);
  }

  const summary = {
    totalTraces: options.traces.length,
    typeBreakdown: Object.fromEntries(typeCount),
    detectedSkills: Array.from(skillRefs),
  };

  const logInfo = options.logInfo ?? logger.info.bind(logger);
  const logDebug = options.logDebug ?? logger.debug.bind(logger);
  if (skillRefs.size > 0) {
    logInfo(`Session ${options.sessionId} trace summary`, summary);
  } else {
    logDebug(`Session ${options.sessionId} trace summary`, summary);
  }

  return summary;
}
