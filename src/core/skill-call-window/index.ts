import type { RuntimeType, Trace } from '../../types/index.js';

export interface SkillCallWindow {
  windowId: string;
  skillId: string;
  runtime: RuntimeType;
  sessionId: string;
  closeReason: string;
  startedAt: string;
  lastTraceAt: string;
  traces: Trace[];
}
