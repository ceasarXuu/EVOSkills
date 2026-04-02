import { Command } from 'commander';
import { cliInfo } from '../../utils/cli-output.js';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createShadowRegistry } from '../../core/shadow-registry/index.js';
import { createJournalManager } from '../../core/journal/index.js';
import { validateSkillId, validateProjectPath } from '../../utils/path.js';
import { printErrorAndExit } from '../../utils/error-helper.js';
import type { ChangeType } from '../../types/index.js';

interface LogOptions {
  project: string;
  limit: string;
  follow?: boolean;
  type?: string;
  since?: string;
  until?: string;
  search?: string;
  appliedBy?: string;
}

/**
 * Log 命令
 * 查看某个 skill 的演化日志
 */
export function createLogCommand(): Command {
  const log = new Command('log');

  log
    .description('Show evolution log for a shadow skill')
    .argument('<skill>', 'Skill ID to show log for')
    .option('-n, --limit <number>', 'Number of records to show', '20')
    .option('-f, --follow', 'Follow log output (like tail -f)')
    .option('-t, --type <type>', 'Filter by change type (comma-separated for multiple)')
    .option('--since <date>', 'Show records since date (YYYY-MM-DD or ISO 8601)')
    .option('--until <date>', 'Show records until date (YYYY-MM-DD or ISO 8601)')
    .option('--search <keyword>', 'Search in reason field (case-insensitive)')
    .option('--applied-by <source>', 'Filter by who applied the change (auto|manual)')
    .option('-p, --project <path>', 'Project root path', process.cwd())
    .alias('history')
    .action(async (skillId: string, options: LogOptions) => {
      try {
        // 验证 skill ID 格式
        if (!validateSkillId(skillId)) {
          printErrorAndExit(
            `Invalid skill ID "${skillId}". Skill IDs can only contain letters, numbers, hyphens, underscores, and dots.`,
            { operation: 'Validate skill ID', skillId },
            'INVALID_SKILL_ID'
          );
        }

        // 验证项目路径安全性
        let projectRoot: string;
        try {
          projectRoot = validateProjectPath(options.project);
        } catch (error) {
          printErrorAndExit(
            error instanceof Error ? error.message : String(error),
            { operation: 'Validate project path', projectPath: options.project },
            'PATH_TRAVERSAL'
          );
        }

        // 检查 .ornn 目录是否存在
        const ornnDir = join(projectRoot, '.ornn');
        if (!existsSync(ornnDir)) {
          printErrorAndExit(
            '.ornn directory not found',
            { operation: 'Check project initialization', projectPath: projectRoot },
            'PROJECT_NOT_INITIALIZED'
          );
        }

        // 初始化组件
        const shadowRegistry = createShadowRegistry(projectRoot);
        const journalManager = createJournalManager(projectRoot);

        shadowRegistry.init();
        await journalManager.init();

        // 检查 shadow 是否存在
        const shadow = shadowRegistry.get(skillId);
        if (!shadow) {
          printErrorAndExit(
            `Shadow skill "${skillId}" not found`,
            { operation: 'Get skill log', skillId, projectPath: projectRoot },
            'SKILL_NOT_FOUND'
          );
        }

        const shadowId = `${skillId}@${projectRoot}`;

        // 验证 limit 参数
        const limit = parseInt(options.limit, 10);
        if (isNaN(limit) || limit < 1 || limit > 1000) {
          printErrorAndExit('Invalid limit value. Must be between 1 and 1000.', {
            operation: 'Validate options',
            skillId,
            projectPath: projectRoot,
          });
        }

        // 解析并验证 changeType 参数（支持多个类型，逗号分隔）
        const validChangeTypes: ChangeType[] = [
          'append_context',
          'tighten_trigger',
          'add_fallback',
          'prune_noise',
          'rewrite_section',
        ];
        let changeTypes: ChangeType[] | undefined;
        if (options.type) {
          const requestedTypes = options.type.split(',').map((t) => t.trim());
          const invalidTypes = requestedTypes.filter(
            (t) => !validChangeTypes.includes(t as ChangeType)
          );
          if (invalidTypes.length > 0) {
            printErrorAndExit(
              `Invalid change type(s): ${invalidTypes.join(', ')}. Valid types are: ${validChangeTypes.join(', ')}`,
              { operation: 'Validate options', skillId, projectPath: projectRoot }
            );
          }
          changeTypes = requestedTypes as ChangeType[];
        }

        // 解析时间范围
        let sinceDate: Date | undefined;
        let untilDate: Date | undefined;
        if (options.since) {
          sinceDate = new Date(options.since);
          if (isNaN(sinceDate.getTime())) {
            printErrorAndExit(
              `Invalid date format for --since: "${options.since}". Use YYYY-MM-DD or ISO 8601 format.`,
              { operation: 'Validate options', skillId, projectPath: projectRoot }
            );
          }
        }
        if (options.until) {
          untilDate = new Date(options.until);
          if (isNaN(untilDate.getTime())) {
            printErrorAndExit(
              `Invalid date format for --until: "${options.until}". Use YYYY-MM-DD or ISO 8601 format.`,
              { operation: 'Validate options', skillId, projectPath: projectRoot }
            );
          }
        }

        // 验证 applied-by 参数
        if (options.appliedBy && !['auto', 'manual'].includes(options.appliedBy)) {
          printErrorAndExit(
            `Invalid --applied-by value: "${options.appliedBy}". Must be "auto" or "manual".`,
            { operation: 'Validate options', skillId, projectPath: projectRoot }
          );
        }

        // 获取记录
        let records = journalManager.getJournalRecords(shadowId, {
          limit,
          changeType: changeTypes?.[0], // 暂时只支持单个类型过滤（后端需要支持多类型）
        });

        // 客户端过滤
        if (sinceDate) {
          records = records.filter(
            (r) => new Date((r as { timestamp: string }).timestamp) >= sinceDate
          );
        }
        if (untilDate) {
          records = records.filter(
            (r) => new Date((r as { timestamp: string }).timestamp) <= untilDate
          );
        }
        if (options.search) {
          const searchLower = options.search.toLowerCase();
          records = records.filter((r) => {
            const reason = ((r as { reason: string }).reason || '').toLowerCase();
            return reason.includes(searchLower);
          });
        }
        if (options.appliedBy) {
          records = records.filter(
            (r) => (r as { applied_by: string }).applied_by === options.appliedBy
          );
        }

        // 显示过滤条件摘要
        const filters: string[] = [];
        if (changeTypes) filters.push(`type: ${changeTypes.join(', ')}`);
        if (sinceDate) filters.push(`since: ${sinceDate.toLocaleDateString()}`);
        if (untilDate) filters.push(`until: ${untilDate.toLocaleDateString()}`);
        if (options.search) filters.push(`search: "${options.search}"`);
        if (options.appliedBy) filters.push(`applied-by: ${options.appliedBy}`);

        if (records.length === 0) {
          cliInfo(`\nNo evolution records found for "${skillId}"`);
          if (filters.length > 0) {
            cliInfo(`\nFilters applied: ${filters.join(', ')}`);
            cliInfo('\nTry relaxing the filters or check available records with:');
            cliInfo(`  $ ornn skills log ${skillId}`);
          }
        } else {
          cliInfo(`\n📋 Evolution log for "${skillId}"`);
          if (filters.length > 0) {
            cliInfo(`   Filters: ${filters.join(' | ')}`);
          }
          cliInfo('');

          for (const record of records as Array<{
            timestamp: string;
            change_type: string;
            applied_by: string;
            revision: number;
            reason: string;
            source_sessions: string[];
          }>) {
            const date = new Date(record.timestamp).toLocaleString();
            const changeType = record.change_type.toUpperCase();
            const appliedBy = record.applied_by === 'auto' ? '🤖' : '👤';

            cliInfo(`${appliedBy} rev_${String(record.revision).padStart(4, '0')} - ${date}`);
            cliInfo(`   Type: ${changeType}`);
            cliInfo(`   Reason: ${record.reason}`);
            cliInfo(`   Sessions: ${record.source_sessions.length}`);
            cliInfo('');
          }

          cliInfo(`Showing ${records.length} record(s)`);
          if (limit > records.length) {
            cliInfo(`(Filtered from ${limit} most recent)`);
          }
          cliInfo('\nFor more details, use:');
          cliInfo(`  $ ornn skills diff ${skillId} --from <revision>`);
        }

        // 关闭
        shadowRegistry.close();
        await journalManager.close();
      } catch (error) {
        printErrorAndExit(
          error instanceof Error ? error.message : String(error),
          { operation: 'Show evolution log', skillId },
          undefined
        );
      }
    });

  return log;
}
