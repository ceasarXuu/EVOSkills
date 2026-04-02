import { Command } from 'commander';
import { cliInfo } from '../../utils/cli-output.js';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createShadowRegistry } from '../../core/shadow-registry/index.js';
import { createJournalManager } from '../../core/journal/index.js';
import { validateSkillId, validateProjectPath } from '../../utils/path.js';
import { printErrorAndExit } from '../../utils/error-helper.js';
import { selectSkillInteractively, type SkillInfo } from '../../utils/interactive-selector.js';

interface StatusOptions {
  project: string;
  skill?: string;
  interactive?: boolean;
}

/**
 * Status 命令
 * 查看当前项目 shadow skills 状态
 */
export function createStatusCommand(): Command {
  const status = new Command('status');

  status
    .description('Show status of shadow skills in current project')
    .option('-p, --project <path>', 'Project root path', process.cwd())
    .option('-s, --skill <id>', 'Show detailed status for specific skill')
    .option('-i, --interactive', 'Select skill interactively', false)
    .alias('ls')
    .alias('list')
    .action(async (options: StatusOptions) => {
      try {
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

        // 处理交互式模式
        if (options.interactive && !options.skill) {
          const shadows = shadowRegistry.list();
          if (shadows.length === 0) {
            cliInfo('No shadow skills found in this project');
            shadowRegistry.close();
            await journalManager.close();
            return;
          }

          const skillInfos: SkillInfo[] = shadows.map((s) => ({
            skillId: s.skill_id || s.skillId,
            status: s.status as string,
            lastOptimized: s.last_optimized_at
              ? new Date(s.last_optimized_at).toLocaleDateString()
              : undefined,
          }));

          const selectedSkill = await selectSkillInteractively(
            skillInfos,
            'Select a skill to view details:'
          );

          if (!selectedSkill) {
            cliInfo('No skill selected.');
            shadowRegistry.close();
            await journalManager.close();
            return;
          }

          options.skill = selectedSkill;
        }

        if (options.skill) {
          // 验证 skill ID 格式
          if (!validateSkillId(options.skill)) {
            printErrorAndExit(
              `Invalid skill ID "${options.skill}". Skill IDs can only contain letters, numbers, hyphens, underscores, and dots.`,
              { operation: 'Validate skill ID', skillId: options.skill, projectPath: projectRoot },
              'INVALID_SKILL_ID'
            );
          }

          // 显示特定 skill 的详细状态
          const shadow = shadowRegistry.get(options.skill);
          if (!shadow) {
            printErrorAndExit(
              `Shadow skill "${options.skill}" not found`,
              { operation: 'Get skill status', skillId: options.skill, projectPath: projectRoot },
              'SKILL_NOT_FOUND'
            );
          }

          const shadowId: string = `${options.skill}@${projectRoot}`;
          const latestRevision = journalManager.getLatestRevision(shadowId);
          const snapshots = journalManager.getSnapshots(shadowId);

          cliInfo(`Shadow Skill: ${options.skill}`);
          cliInfo(`Status: ${shadow.status}`);
          cliInfo(`Current Revision: ${latestRevision}`);
          cliInfo(`Created: ${shadow.created_at}`);
          cliInfo(`Last Optimized: ${shadow.last_optimized_at || 'Never'}`);
          cliInfo(`Snapshots: ${snapshots.length}`);

          if (snapshots.length > 0) {
            cliInfo('\nRecent Snapshots:');
            for (const snapshot of snapshots.slice(0, 5)) {
              cliInfo(`  rev_${String(snapshot.revision).padStart(4, '0')} - ${snapshot.timestamp}`);
            }
          }
        } else {
          // 列出所有 shadow skills
          const shadows = shadowRegistry.list();

          if (shadows.length === 0) {
            cliInfo('No shadow skills found in this project');
            cliInfo('\nTo create a shadow skill, use:');
            cliInfo('  ornn skills fork <skill-id>');
          } else {
            cliInfo(`Shadow Skills in ${projectRoot}:\n`);
            cliInfo('Skill ID                Status      Revision  Last Optimized');
            cliInfo('─'.repeat(70));

            for (const shadow of shadows) {
              const skillId = shadow.skill_id || shadow.skillId || 'unknown';
              const shadowId = `${skillId}@${projectRoot}`;
              const latestRevision = journalManager.getLatestRevision(shadowId);
              const lastOptimized =
                shadow.last_optimized_at || shadow.updatedAt
                  ? new Date(shadow.last_optimized_at || shadow.updatedAt).toLocaleDateString()
                  : 'Never';

              cliInfo(`${skillId.padEnd(22)} ${shadow.status.padEnd(11)} ${String(latestRevision).padEnd(9)} ${lastOptimized}`);
            }

            cliInfo('\nFor detailed status of a specific skill:');
            cliInfo('  ornn skills status --skill <skill-id>');
          }
        }

        // 关闭
        shadowRegistry.close();
        await journalManager.close();
      } catch (error) {
        printErrorAndExit(
          error instanceof Error ? error.message : String(error),
          { operation: 'Show status', projectPath: options.project },
          undefined
        );
      }
    });

  return status;
}
