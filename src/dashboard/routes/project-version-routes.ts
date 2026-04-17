import { readSkillVersion } from '../data-reader.js';
import { resolveDashboardRuntime, toggleSkillVersionState } from '../services/skill-version-service.js';

interface RouteLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

interface ProjectVersionRouteContext {
  subPath: string;
  method: string;
  projectPath: string;
  url: URL;
  json: (data: unknown, status?: number) => void;
  parseBody: () => Promise<unknown>;
  notFound: () => void;
  logger: RouteLogger;
}

export async function handleProjectVersionRoutes(context: ProjectVersionRouteContext): Promise<boolean> {
  const { subPath, method, projectPath, url, json, parseBody, notFound, logger } = context;
  const versionMatch = subPath.match(/^\/skills\/([^/]+)\/versions\/(\d+)$/);

  if (!versionMatch) {
    return false;
  }

  const skillId = decodeURIComponent(versionMatch[1]);
  const version = parseInt(versionMatch[2], 10);
  const runtime = resolveDashboardRuntime(undefined, url.searchParams.get('runtime'));

  if (method === 'PATCH') {
    const body = (await parseBody()) as { disabled?: unknown };
    if (typeof body.disabled !== 'boolean') {
      json({ ok: false, error: 'disabled must be a boolean' }, 400);
      return true;
    }

    const result = toggleSkillVersionState({
      projectPath,
      skillId,
      runtime,
      version,
      disabled: body.disabled,
      logger,
    });
    if (!result.ok && result.notFound) {
      notFound();
      return true;
    }
    if (!result.ok) {
      json(
        {
          ok: false,
          error: result.error,
          ...(result.detail ? { detail: result.detail } : {}),
          ...(typeof result.version === 'number' ? { version: result.version } : {}),
          ...(typeof result.effectiveVersion === 'number' ? { effectiveVersion: result.effectiveVersion } : {}),
        },
        result.status
      );
      return true;
    }

    json(result);
    return true;
  }

  if (method === 'GET') {
    const result = readSkillVersion(projectPath, skillId, version, runtime);
    if (!result) {
      notFound();
      return true;
    }
    json(result);
    return true;
  }

  return false;
}
