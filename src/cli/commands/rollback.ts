import { Command } from 'commander';
import { cliInfo } from '../../utils/cli-output.js';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createShadowRegistry } from '../../core/shadow-registry/index.js';
import { createJournalManager } from '../../core/journal/index.js';
import { validateSkillId, validateProjectPath } from '../../utils/path.js';
import { printErrorAndExit } from '../../utils/error-helper.js';

interface RollbackOptions {
  project: string;
  to?: string;
  snapshot?: boolean;
  initial?: boolean;
  force?: boolean;
}

/**
 * 验证 revision 号
 */
function validateRevision(input: string): number {
  const revision = parseInt(input, 10);

  if (isNaN(revision)) {
    throw new Error('Invalid revision number. Must be a valid integer.');
  }

  if (revision < 0) {
    throw new Error('Invalid revision number. Must be a non-negative integer.');
  }

  if (revision > Number.MAX_SAFE_INTEGER) {
    throw new Error('Invalid revision number. Exceeds maximum safe integer.');
  }

  return revision;
}

/**
 * Rollback 命令
 * 回滚 shadow skill 到指定版本
 */
export function createRollbackCommand(): Command {
  const rollback = new Command('rollback');

  rollback
    .description('Rollback a shadow skill to a previous version')
    .argument('<skill>', 'Skill ID to rollback')
    .option('-t, --to <revision>', 'Rollback to specific revision')
    .option('-s, --snapshot', 'Rollback to latest snapshot')
    .option('-i, --initial', 'Rollback to initial version (revision 0)')
    .option('-p, --project <path>', 'Project root path', process.cwd())
    .option('-f, --force', 'Skip confirmation prompt', false)
    .alias('revert')
    .action(async (skillId: string, options: RollbackOptions) => {
      try {
        // 验证 skill ID 格式
        if (!validateSkillId(skillId)) {
          printErrorAndExit(
            `Invalid skill ID "${skillId}". Skill IDs can only contain letters, numbers, hyphens, underscores, and dots.`,
            { operation: 'Validate skill ID', skillId, projectPath: options.project },
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
            { operation: 'Rollback skill', skillId, projectPath: projectRoot },
            'SKILL_NOT_FOUND'
          );
        }

        const shadowId = `${skillId}@${projectRoot}`;

        // 确定回滚目标
        let targetRevision: number | undefined;
        let rollbackDescription = '';

        if (options.initial) {
          targetRevision = 0;
          rollbackDescription = 'initial version';
        } else if (options.snapshot) {
          const snapshots = journalManager.getSnapshots(shadowId);
          if (snapshots.length > 0) {
            const latestSnapshot = snapshots[snapshots.length - 1];
            targetRevision = latestSnapshot.revision;
            rollbackDescription = `snapshot at rev_${String(targetRevision).padStart(4, '0')}`;
          } else {
            cliInfo(`No snapshots found for "${skillId}"`);
            shadowRegistry.close();
            await journalManager.close();
            return;
          }
        } else if (options.to) {
          try {
            targetRevision = validateRevision(options.to);
          } catch (error) {
            printErrorAndExit(
              error instanceof Error ? error.message : String(error),
              { operation: 'Validate revision', skillId, projectPath: projectRoot },
              'INVALID_REVISION'
            );
          }
          rollbackDescription = `revision ${targetRevision}`;
        } else {
          // 显示可用的 revisions
          cliInfo(`Available snapshots for "${skillId}":\n`);
          const snapshots = journalManager.getSnapshots(shadowId);

          if (snapshots.length === 0) {
            cliInfo('No snapshots available');
          } else {
            for (const snapshot of snapshots) {
              cliInfo(`  rev_${String(snapshot.revision).padStart(4, '0')} - ${snapshot.timestamp}`);
            }
          }

          cliInfo('\nUsage:');
          cliInfo(`  ornn skills rollback ${skillId} --to <revision>`);
          cliInfo(`  ornn skills rollback ${skillId} --snapshot`);
          cliInfo(`  ornn skills rollback ${skillId} --initial`);
          shadowRegistry.close();
          await journalManager.close();
          return;
        }

        // 用户确认（除非使用 --force）
        if (!options.force) {
          const inquirer = await import('inquirer').then((m) => m.default || m);
          cliInfo(`\n⚠️  Warning: This will rollback "${skillId}" to ${rollbackDescription}`);
          cliInfo('   This action can be reversed by rolling forward again.');
          cliInfo('');

          const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
            {
              type: 'confirm',
              name: 'confirmed',
              message: `Are you sure you want to proceed?`,
              default: false,
            },
          ]);

          if (!confirmed) {
            cliInfo('Rollback cancelled.');
            shadowRegistry.close();
            await journalManager.close();
            return;
          }
        }

        // 执行回滚
        if (options.initial || options.to) {
          cliInfo(`Rolling back "${skillId}" to ${rollbackDescription}...`);
          journalManager.rollback(shadowId, targetRevision);
          cliInfo(`✅ Successfully rolled back to ${rollbackDescription}`);
        } else if (options.snapshot) {
          cliInfo(`Rolling back "${skillId}" to ${rollbackDescription}...`);
          const snapshots = journalManager.getSnapshots(shadowId);
          const latestSnapshot = snapshots[snapshots.length - 1];
          journalManager.rollbackToSnapshot(shadowId, latestSnapshot.file_path);
          cliInfo(`✅ Successfully rolled back to ${rollbackDescription}`);
        }

        // 关闭
        shadowRegistry.close();
        await journalManager.close();
      } catch (error) {
        printErrorAndExit(
          error instanceof Error ? error.message : String(error),
          { operation: 'Rollback skill', skillId },
          undefined
        );
      }
    });

  return rollback;
}
