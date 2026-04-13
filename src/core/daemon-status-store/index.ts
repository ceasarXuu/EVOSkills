import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export type DaemonOptimizationState = 'idle' | 'analyzing' | 'optimizing' | 'error';

export class DaemonStatusStore {
  private checkpointPath: string;

  constructor(projectRoot: string) {
    this.checkpointPath = join(projectRoot, '.ornn', 'state', 'daemon-checkpoint.json');
  }

  private readCheckpoint(): Record<string, unknown> {
    const fallback: Record<string, unknown> = {
      isRunning: true,
      startedAt: new Date().toISOString(),
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

    if (!existsSync(this.checkpointPath)) {
      return fallback;
    }

    try {
      return JSON.parse(readFileSync(this.checkpointPath, 'utf-8')) as Record<string, unknown>;
    } catch {
      return fallback;
    }
  }

  private writeOptimizationState(
    state: DaemonOptimizationState,
    skillId: string | null,
    error: string | null = null
  ): void {
    const checkpoint = this.readCheckpoint();
    const previous = (checkpoint.optimizationStatus && typeof checkpoint.optimizationStatus === 'object')
      ? checkpoint.optimizationStatus as Record<string, unknown>
      : {};

    checkpoint.lastCheckpointAt = new Date().toISOString();
    checkpoint.optimizationStatus = {
      currentState: state,
      currentSkillId: state === 'idle' ? null : skillId,
      lastOptimizationAt: state === 'idle' ? new Date().toISOString() : previous.lastOptimizationAt ?? null,
      lastError: state === 'error' ? error : null,
      queueSize: state === 'idle' || state === 'error' ? 0 : 1,
    };

    mkdirSync(dirname(this.checkpointPath), { recursive: true });
    writeFileSync(this.checkpointPath, JSON.stringify(checkpoint, null, 2), 'utf-8');
  }

  setIdle(): void {
    this.writeOptimizationState('idle', null, null);
  }

  setAnalyzing(skillId: string): void {
    this.writeOptimizationState('analyzing', skillId, null);
  }

  setOptimizing(skillId: string): void {
    this.writeOptimizationState('optimizing', skillId, null);
  }

  setError(skillId: string | null, error: string): void {
    this.writeOptimizationState('error', skillId, error);
  }
}

export function createDaemonStatusStore(projectRoot: string): DaemonStatusStore {
  return new DaemonStatusStore(projectRoot);
}
