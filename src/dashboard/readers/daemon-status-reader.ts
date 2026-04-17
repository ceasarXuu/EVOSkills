import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { getProjectRegistration } from '../projects-registry.js';
import { readRecentDecisionEvents } from './decision-events-reader.js';
import { countProcessedTraceIds } from './trace-reader.js';

export interface DaemonStatus {
  isRunning: boolean;
  isPaused?: boolean;
  pid: number | null;
  startedAt: string | null;
  processedTraces: number;
  lastCheckpointAt: string | null;
  retryQueueSize: number;
  monitoringState?: 'active' | 'paused';
  pausedAt?: string | null;
  optimizationStatus: {
    currentState: 'idle' | 'analyzing' | 'optimizing' | 'error';
    currentSkillId: string | null;
    lastOptimizationAt: string | null;
    lastError: string | null;
    queueSize: number;
  };
}

function getGlobalDaemonPidPath(): string {
  return join(homedir(), '.ornn', 'daemon.pid');
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function backfillOptimizationStatus(
  projectRoot: string,
  current: DaemonStatus['optimizationStatus']
): DaemonStatus['optimizationStatus'] {
  let next = { ...current };
  const taskEpisodesPath = join(projectRoot, '.ornn', 'state', 'task-episodes.json');
  if (existsSync(taskEpisodesPath)) {
    try {
      const parsed = JSON.parse(readFileSync(taskEpisodesPath, 'utf-8')) as {
        episodes?: Array<{
          state?: string;
          skillSegments?: Array<{ skillId?: string }>;
          analysisStatus?: string;
        }>;
      };
      const activeEpisode = parsed.episodes?.find(
        (episode) => episode.analysisStatus === 'running' || episode.state === 'analyzing'
      );
      if (activeEpisode) {
        next = {
          ...next,
          currentState: 'analyzing',
          currentSkillId: activeEpisode.skillSegments?.[0]?.skillId ?? next.currentSkillId,
          queueSize: Math.max(next.queueSize, 1),
        };
      }
    } catch {
      // ignore malformed snapshot
    }
  }

  const events = readRecentDecisionEvents(projectRoot, 200);
  if (!next.lastOptimizationAt) {
    const latestPatch = events.find((event) => event.tag === 'patch_applied');
    if (latestPatch?.timestamp) {
      next.lastOptimizationAt = latestPatch.timestamp;
    }
  }
  if (!next.lastError) {
    const latestTerminalEvent = events.find((event) =>
      event.tag === 'analysis_failed' ||
      event.tag === 'patch_applied' ||
      event.tag === 'evaluation_result'
    );
    if (latestTerminalEvent?.tag === 'analysis_failed') {
      next = {
        ...next,
        lastError: latestTerminalEvent.detail ?? latestTerminalEvent.reason ?? next.lastError,
      };
    }
  }

  return next;
}

export function readDaemonStatus(projectRoot: string): DaemonStatus {
  const checkpointPath = join(projectRoot, '.ornn', 'state', 'daemon-checkpoint.json');
  const projectPidPath = join(projectRoot, '.ornn', 'daemon.pid');
  const pidPath = existsSync(projectPidPath) ? projectPidPath : getGlobalDaemonPidPath();

  let checkpoint: Omit<DaemonStatus, 'isRunning' | 'pid'> = {
    startedAt: null,
    processedTraces: 0,
    lastCheckpointAt: null,
    retryQueueSize: 0,
    optimizationStatus: {
      currentState: 'idle',
      currentSkillId: null,
      lastOptimizationAt: null,
      lastError: null,
      queueSize: 0,
    },
  };

  if (existsSync(checkpointPath)) {
    try {
      const raw = readFileSync(checkpointPath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<DaemonStatus>;
      checkpoint = { ...checkpoint, ...parsed };
    } catch {
      // use defaults
    }
  }

  let pid: number | null = null;
  if (existsSync(pidPath)) {
    try {
      pid = parseInt(readFileSync(pidPath, 'utf-8').trim(), 10);
      if (Number.isNaN(pid)) pid = null;
    } catch {
      pid = null;
    }
  }

  const isRunning = pid !== null && isProcessRunning(pid);
  if ((checkpoint.processedTraces ?? 0) <= 0) {
    checkpoint.processedTraces = countProcessedTraceIds(projectRoot);
  }

  const backfilled = backfillOptimizationStatus(projectRoot, checkpoint.optimizationStatus);
  const registration = getProjectRegistration(projectRoot);
  const monitoringState = registration?.monitoringState === 'paused' ? 'paused' : 'active';
  const isPaused = monitoringState === 'paused';
  const pausedAt = isPaused ? registration?.pausedAt ?? null : null;
  const effectiveOptimizationStatus = isPaused
    ? {
        ...backfilled,
        currentState: 'idle' as const,
        currentSkillId: null,
        lastError: null,
        queueSize: 0,
      }
    : backfilled;

  return {
    ...checkpoint,
    isRunning: isPaused ? false : isRunning,
    isPaused,
    pid,
    monitoringState,
    pausedAt,
    optimizationStatus: effectiveOptimizationStatus,
  };
}
