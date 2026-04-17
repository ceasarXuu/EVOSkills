import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function readCheckpointStats(
  projectRoot: string,
): { processedTraces: number; startedAt: string } | null {
  const checkpointPath = join(projectRoot, '.ornn', 'state', 'daemon-checkpoint.json');
  if (!existsSync(checkpointPath)) {
    return null;
  }

  try {
    const data = JSON.parse(readFileSync(checkpointPath, 'utf-8')) as Record<string, unknown>;
    return {
      processedTraces: (data.processedTraces as number) || 0,
      startedAt:
        (data.startedAt as string) || (data.started_at as string) || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function readOptimizationStats(projectRoot: string): {
  currentState: string;
  currentSkillId: string | null;
  lastOptimizationAt: string | null;
  lastError: string | null;
  queueSize: number;
} | null {
  const checkpointPath = join(projectRoot, '.ornn', 'state', 'daemon-checkpoint.json');
  if (!existsSync(checkpointPath)) {
    return null;
  }

  try {
    const data = JSON.parse(readFileSync(checkpointPath, 'utf-8')) as Record<string, unknown>;
    if (data.optimizationStatus) {
      return data.optimizationStatus as {
        currentState: string;
        currentSkillId: string | null;
        lastOptimizationAt: string | null;
        lastError: string | null;
        queueSize: number;
      };
    }
    return null;
  } catch {
    return null;
  }
}
