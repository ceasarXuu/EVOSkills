import { Command } from 'commander';
import { cliInfo } from '../../utils/cli-output.js';
import { join } from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';
import { createShadowRegistry } from '../../core/shadow-registry/index.js';
import { originRegistry } from '../../core/origin-registry/index.js';
import { createMarkdownSkill } from '../../storage/markdown.js';
import { validateSkillId, validateProjectPath, getShadowSkillPath } from '../../utils/path.js';
import { printErrorAndExit } from '../../utils/error-helper.js';
import { createUnifiedDiff, countChanges } from '../../utils/diff.js';

interface SyncOptions {
  project: string;
  force?: boolean;
}

/**
 * Sync 命令
 * 将 shadow skill 同步回 origin
 */
export function createSyncCommand(): Command {
  const sync = new Command('sync');

  sync
    .description('Sync shadow skill back to origin (apply optimizations)')
    .argument('<skill>', 'Skill ID to sync')
    .option('-p, --project <path>', 'Project root path', process.cwd())
    .option('-f, --force', 'Force sync without confirmation', false)
    .action(async (skillId: string, options: SyncOptions) => {
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

        // 初始化 shadow registry
        const shadowRegistry = createShadowRegistry(projectRoot);
        shadowRegistry.init();

        // 检查 shadow skill 是否存在
        const shadow = shadowRegistry.get(skillId);
        if (!shadow) {
          printErrorAndExit(
            `Shadow skill "${skillId}" not found in this project`,
            { operation: 'Sync skill', skillId, projectPath: projectRoot },
            'SKILL_NOT_FOUND'
          );
        }

        // 扫描 origin registry
        originRegistry.scan();
        const origin = originRegistry.get(skillId);

        if (!origin) {
          printErrorAndExit(
            `Origin skill "${skillId}" not found`,
            { operation: 'Sync skill', skillId, projectPath: projectRoot },
            'ORIGIN_NOT_FOUND'
          );
        }

        // 读取 shadow 内容
        const shadowPath = getShadowSkillPath(projectRoot, skillId);
        const shadowSkill = createMarkdownSkill(shadowPath);
        const shadowContent = shadowSkill.read();

        // 读取 origin 内容（用于显示 diff）
        const originContent = originRegistry.readContent(skillId);

        // 确保 originContent 存在
        if (!originContent) {
          printErrorAndExit(`Cannot read origin content for "${skillId}"`, {
            operation: 'Read origin content',
            skillId,
            projectPath: projectRoot,
          });
        }

        // 如果没有变化
        if (originContent === shadowContent) {
          cliInfo(`✓ Skill "${skillId}" is already up to date.`);
          cliInfo(`  No changes to sync.`);
          shadowRegistry.close();
          return;
        }

        // 显示将要同步的信息
        const originPath = origin.skillPath;
        cliInfo(`\n📦 Syncing skill "${skillId}" to origin...`);
        cliInfo(`  Shadow: ${shadowPath}`);
        cliInfo(`  Origin: ${originPath}`);
        cliInfo('');

        // 显示 diff
        const changes = countChanges(originContent, shadowContent);
        cliInfo(`📊 Changes to be applied:`);
        cliInfo(`  +${changes.added} lines added`);
        cliInfo(`  -${changes.removed} lines removed`);
        cliInfo('');

        const diffOutput = createUnifiedDiff(
          skillId,
          originContent,
          shadowContent,
          'origin',
          'shadow'
        );
        cliInfo('Diff:');
        cliInfo(diffOutput);
        cliInfo('');

        // 用户确认（除非使用 --force）
        if (!options.force) {
          const inquirer = await import('inquirer').then((m) => m.default || m);
          const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
            {
              type: 'confirm',
              name: 'confirmed',
              message:
                'Sync this optimized skill back to origin? This will update the global skill.',
              default: false,
            },
          ]);

          if (!confirmed) {
            cliInfo('Sync cancelled.');
            shadowRegistry.close();
            return;
          }
        }

        // 执行同步：将 shadow 内容写入 origin
        try {
          writeFileSync(originPath, shadowContent, 'utf-8');
          cliInfo(`\n✓ Successfully synced "${skillId}" to origin!`);
          cliInfo(`  The optimized skill is now active globally.`);
          cliInfo('');
          cliInfo(`  Origin path: ${originPath}`);
          cliInfo('');
          cliInfo(`  Note: This affects all projects using this skill.`);
          cliInfo(`  To revert, restore the original skill from backup or version control.`);
        } catch (error) {
          printErrorAndExit(
            `Failed to write to origin path: ${error instanceof Error ? error.message : String(error)}`,
            { operation: 'Write to origin', skillId, projectPath: projectRoot }
          );
        }

        // 关闭 registry
        shadowRegistry.close();
      } catch (error) {
        printErrorAndExit(
          error instanceof Error ? error.message : String(error),
          { operation: 'Sync skill', skillId },
          undefined
        );
      }
    });

  return sync;
}
