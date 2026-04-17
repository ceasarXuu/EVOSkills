import type { RuntimeType, TraceEventType, TraceStatus } from '../../types/index.js';

export interface JournalRecord {
  revision: number;
  timestamp: string;
  change_type: string;
  applied_by: string;
  reason: string;
  source_sessions: string[];
}

export interface JournalOptions {
  projectPath: string;
  dbPath?: string;
  maxTraces?: number;
  retentionDays?: number;
}

export interface TraceQuery {
  sessionId?: string;
  runtime?: RuntimeType;
  eventType?: TraceEventType;
  status?: TraceStatus;
  skillRef?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

export interface TraceStats {
  totalTraces: number;
  byRuntime: Record<RuntimeType, number>;
  byEventType: Record<TraceEventType, number>;
  byStatus: Record<TraceStatus, number>;
  timeRange: {
    earliest: Date | null;
    latest: Date | null;
  };
}
