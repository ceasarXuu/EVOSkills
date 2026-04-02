import { Command } from 'commander';
import { cliInfo, cliError } from '../../utils/cli-output.js';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createShadowRegistry } from '../../core/shadow-registry/index.js';
import { validateSkillId, validateProjectPath } from '../../utils/path.js';
import {
  selectMultipleSkillsInteractively,
  showDryRunPreview,
  type SkillInfo,
} from '../../utils/interactive-selector.js';

interface FreezeOptions {
  project: string;
  all?: boolean;
  force?: boolean;
  dryRun?: boolean;
  interactive?: boolean;
}

/**
 * Freeze 命令
 * 暂停某个 skill 的自动优化
 */
export function createFreezeCommand(): Command {
  const freeze = new Command('freeze');

  freeze
    .description('Pause automatic optimization for a shadow skill')
    .argument('[skill]', 'Skill ID to freeze (use "all" to freeze all skills)')
    .option('-p, --project <path>', 'Project root path', process.cwd())
    .option('-f, --force', 'Skip confirmation prompt', false)
    .option('--dry-run', 'Show what would be frozen without making changes', false)
    .option('-i, --interactive', 'Select skills interactively', false)
    .action(async (skillId: string | undefined, options: FreezeOptions) => {
      try {
        // 验证项目路径安全性
        let projectRoot: string;
        try {
          projectRoot = validateProjectPath(options.project);
        } catch (error) {
          cliError(`Error: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(1);
        }

        // 检查 .ornn 目录是否存在
        const ornnDir = join(projectRoot, '.ornn');
        if (!existsSync(ornnDir)) {
          cliError('Error: .ornn directory not found. Run "ornn init" first.');
          process.exit(1);
        }

        // 初始化组件
        const shadowRegistry = createShadowRegistry(projectRoot);
        shadowRegistry.init();

        const shadows = shadowRegistry.list();

        if (shadows.length === 0) {
          cliInfo('No shadow skills found in this project');
          shadowRegistry.close();
          return;
        }

        // 处理交互式模式
        if (options.interactive && !skillId) {
          const skillInfos: SkillInfo[] = shadows.map((s) => ({
            skillId: s.skill_id || s.skillId,
            status: s.status as string,
            lastOptimized: s.last_optimized_at
              ? new Date(s.last_optimized_at).toLocaleDateString()
              : undefined,
          }));

          const selectedSkills = await selectMultipleSkillsInteractively(
            skillInfos,
            'Select skills to freeze (use space to select, enter to confirm):'
          );

          if (selectedSkills.length === 0) {
            cliInfo('No skills selected. Freeze cancelled.');
            shadowRegistry.close();
            return;
          }

          // 更新 skillId 为选中的技能
          if (selectedSkills.length === 1) {
            skillId = selectedSkills[0];
          } else {
            // 批量处理选中的技能
            await freezeMultipleSkills(
              selectedSkills,
              shadows,
              projectRoot,
              shadowRegistry,
              options
            );
            return;
          }
        }

        // 如果没有指定 skill，显示帮助
        if (!skillId) {
          cliInfo('Usage: ornn skills freeze <skill-id> [--all] [--interactive]');
          cliInfo('\nAvailable skills:');
          shadows.forEach((shadow) => {
            const sid = shadow.skill_id || shadow.skillId;
            cliInfo(`  - ${sid} [${shadow.status}]`);
          });
          cliInfo('\nUse --interactive to select skills interactively.');
          shadowRegistry.close();
          return;
        }

        // 处理 --all 选项
        if (skillId === 'all' || options.all) {
          const skillsToFreeze = shadows.filter((s) => s.status !== 'frozen');

          if (skillsToFreeze.length === 0) {
            cliInfo('All skills are already frozen.');
            shadowRegistry.close();
            return;
          }

          // Dry run 预览
          if (options.dryRun) {
            const preview = skillsToFreeze.map((shadow) => ({
              id: shadow.skill_id || shadow.skillId,
              currentState: shadow.status as string,
              newState: 'frozen',
            }));
            showDryRunPreview('Freeze Skills', preview);
            shadowRegistry.close();
            return;
          }

          // 用户确认
          if (!options.force) {
            const inquirer = await import('inquirer').then((m) => m.default || m);
            cliInfo(`\n⚠️  Warning: This will freeze ${skillsToFreeze.length} shadow skill(s)`);
            cliInfo('   Frozen skills will not receive automatic optimizations.');
            cliInfo('');

            const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
              {
                type: 'confirm',
                name: 'confirmed',
                message: `Are you sure you want to freeze all skills?`,
                default: false,
              },
            ]);

            if (!confirmed) {
              cliInfo('Freeze cancelled.');
              shadowRegistry.close();
              return;
            }
          }

          let frozenCount = 0;
          for (const shadow of skillsToFreeze) {
            const sid = shadow.skill_id || shadow.skillId;
            const shadowId = `${sid}@${projectRoot}`;
            shadowRegistry.updateStatus(shadowId, 'frozen');
            frozenCount++;
          }

          cliInfo(`✅ Successfully froze ${frozenCount} shadow skill(s)`);
          cliInfo('\nTo unfreeze all, use:');
          cliInfo(`  ornn skills unfreeze all`);
          shadowRegistry.close();
          return;
        }

        // 单个 skill 操作
        // 验证 skill ID 格式
        if (!validateSkillId(skillId)) {
          cliError(
            `Error: Invalid skill ID "${skillId}". Skill IDs can only contain letters, numbers, hyphens, underscores, and dots.`
          );
          process.exit(1);
        }

        // 检查 shadow 是否存在
        const shadow = shadowRegistry.get(skillId);
        if (!shadow) {
          cliError(`Error: Shadow skill "${skillId}" not found`);
          cliInfo('\nAvailable skills:');
          shadows.forEach((s) => {
            cliInfo(`  - ${s.skill_id || s.skillId} [${s.status}]`);
          });
          process.exit(1);
        }

        // 检查是否已经是 frozen
        if (shadow.status === 'frozen') {
          cliInfo(`Skill "${skillId}" is already frozen.`);
          shadowRegistry.close();
          return;
        }

        // Dry run 预览
        if (options.dryRun) {
          showDryRunPreview('Freeze Skill', [
            {
              id: skillId,
              currentState: shadow.status,
              newState: 'frozen',
            },
          ]);
          shadowRegistry.close();
          return;
        }

        // 用户确认
        if (!options.force) {
          const inquirer = await import('inquirer').then((m) => m.default || m);
          cliInfo(`\n⚠️  Warning: This will freeze "${skillId}"`);
          cliInfo('   Frozen skills will not receive automatic optimizations.');
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
            cliInfo('Freeze cancelled.');
            shadowRegistry.close();
            return;
          }
        }

        // 更新状态为 frozen
        const shadowId = `${skillId}@${projectRoot}`;
        shadowRegistry.updateStatus(shadowId, 'frozen');

        cliInfo(`✅ Shadow skill "${skillId}" has been frozen`);
        cliInfo('Automatic optimization is now paused for this skill');
        cliInfo('\nTo unfreeze, use:');
        cliInfo(`  ornn skills unfreeze ${skillId}`);

        // 关闭
        shadowRegistry.close();
      } catch (error) {
        cliError(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  return freeze;
}

/**
 * 批量冻结技能
 */
async function freezeMultipleSkills(
  skillIds: string[],
  shadows: Array<{ skill_id?: string; skillId?: string; status?: string }>,
  projectRoot: string,
  shadowRegistry: ReturnType<typeof createShadowRegistry>,
  options: FreezeOptions
): Promise<void> {
  // 过滤出需要冻结的技能
  const skillsToFreeze = skillIds.filter((id) => {
    const shadow = shadows.find((s) => (s.skill_id || s.skillId) === id);
    return shadow && shadow.status !== 'frozen';
  });

  if (skillsToFreeze.length === 0) {
    cliInfo('All selected skills are already frozen.');
    shadowRegistry.close();
    return;
  }

  // Dry run 预览
  if (options.dryRun) {
    const preview = skillsToFreeze.map((id) => {
      const shadow = shadows.find((s) => (s.skill_id || s.skillId) === id);
      return {
        id,
        currentState: (shadow?.status as string) || 'unknown',
        newState: 'frozen',
      };
    });
    showDryRunPreview('Freeze Skills', preview);
    shadowRegistry.close();
    return;
  }

  // 用户确认
  if (!options.force) {
    const inquirer = await import('inquirer').then((m) => m.default || m);
    cliInfo(`\n⚠️  Warning: This will freeze ${skillsToFreeze.length} shadow skill(s)`);
    cliInfo('   Frozen skills will not receive automatic optimizations.');
    cliInfo('');

    const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
      {
        type: 'confirm',
        name: 'confirmed',
        message: `Are you sure you want to freeze these skills?`,
        default: false,
      },
    ]);

    if (!confirmed) {
      cliInfo('Freeze cancelled.');
      shadowRegistry.close();
      return;
    }
  }

  let frozenCount = 0;
  for (const id of skillsToFreeze) {
    const shadowId = `${id}@${projectRoot}`;
    shadowRegistry.updateStatus(shadowId, 'frozen');
    frozenCount++;
  }

  cliInfo(`✅ Successfully froze ${frozenCount} shadow skill(s)`);
  cliInfo('\nTo unfreeze, use:');
  cliInfo(`  ornn skills unfreeze <skill-id>`);
  shadowRegistry.close();
}

/**
 * Unfreeze 命令
 * 恢复某个 skill 的自动优化
 */
export function createUnfreezeCommand(): Command {
  const unfreeze = new Command('unfreeze');

  unfreeze
    .description('Resume automatic optimization for a shadow skill')
    .argument('[skill]', 'Skill ID to unfreeze (use "all" to unfreeze all skills)')
    .option('-p, --project <path>', 'Project root path', process.cwd())
    .option('-f, --force', 'Skip confirmation prompt', false)
    .option('--dry-run', 'Show what would be unfrozen without making changes', false)
    .option('-i, --interactive', 'Select skills interactively', false)
    .action(async (skillId: string | undefined, options: FreezeOptions) => {
      try {
        // 验证项目路径安全性
        let projectRoot: string;
        try {
          projectRoot = validateProjectPath(options.project);
        } catch (error) {
          cliError(`Error: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(1);
        }

        // 检查 .ornn 目录是否存在
        const ornnDir = join(projectRoot, '.ornn');
        if (!existsSync(ornnDir)) {
          cliError('Error: .ornn directory not found. Run "ornn init" first.');
          process.exit(1);
        }

        // 初始化组件
        const shadowRegistry = createShadowRegistry(projectRoot);
        shadowRegistry.init();

        const shadows = shadowRegistry.list();

        if (shadows.length === 0) {
          cliInfo('No shadow skills found in this project');
          shadowRegistry.close();
          return;
        }

        // 处理交互式模式
        if (options.interactive && !skillId) {
          const frozenSkills = shadows.filter((s) => s.status === 'frozen');

          if (frozenSkills.length === 0) {
            cliInfo('No frozen skills to unfreeze.');
            shadowRegistry.close();
            return;
          }

          const skillInfos: SkillInfo[] = frozenSkills.map((s) => ({
            skillId: s.skill_id || s.skillId,
            status: s.status as string,
            lastOptimized: s.last_optimized_at
              ? new Date(s.last_optimized_at).toLocaleDateString()
              : undefined,
          }));

          const selectedSkills = await selectMultipleSkillsInteractively(
            skillInfos,
            'Select skills to unfreeze (use space to select, enter to confirm):'
          );

          if (selectedSkills.length === 0) {
            cliInfo('No skills selected. Unfreeze cancelled.');
            shadowRegistry.close();
            return;
          }

          // 批量处理选中的技能
          await unfreezeMultipleSkills(
            selectedSkills,
            shadows,
            projectRoot,
            shadowRegistry,
            options
          );
          return;
        }

        // 如果没有指定 skill，显示帮助
        if (!skillId) {
          cliInfo('Usage: ornn skills unfreeze <skill-id> [--all] [--interactive]');
          cliInfo('\nFrozen skills:');
          const frozenSkills = shadows.filter((s) => s.status === 'frozen');
          if (frozenSkills.length === 0) {
            cliInfo('  (none)');
          } else {
            frozenSkills.forEach((shadow) => {
              const sid = shadow.skill_id || shadow.skillId;
              cliInfo(`  - ${sid}`);
            });
          }
          cliInfo('\nUse --interactive to select skills interactively.');
          shadowRegistry.close();
          return;
        }

        // 处理 --all 选项
        if (skillId === 'all' || options.all) {
          const skillsToUnfreeze = shadows.filter((s) => s.status === 'frozen');

          if (skillsToUnfreeze.length === 0) {
            cliInfo('No frozen skills to unfreeze.');
            shadowRegistry.close();
            return;
          }

          // Dry run 预览
          if (options.dryRun) {
            const preview = skillsToUnfreeze.map((shadow) => ({
              id: shadow.skill_id || shadow.skillId,
              currentState: shadow.status as string,
              newState: 'active',
            }));
            showDryRunPreview('Unfreeze Skills', preview);
            shadowRegistry.close();
            return;
          }

          // 用户确认
          if (!options.force) {
            const inquirer = await import('inquirer').then((m) => m.default || m);
            cliInfo(`\n⚠️  Warning: This will unfreeze ${skillsToUnfreeze.length} shadow skill(s)`);
            cliInfo('   Unfrozen skills will resume receiving automatic optimizations.');
            cliInfo('');

            const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
              {
                type: 'confirm',
                name: 'confirmed',
                message: `Are you sure you want to unfreeze all skills?`,
                default: false,
              },
            ]);

            if (!confirmed) {
              cliInfo('Unfreeze cancelled.');
              shadowRegistry.close();
              return;
            }
          }

          let unfrozenCount = 0;
          for (const shadow of skillsToUnfreeze) {
            const sid = shadow.skill_id || shadow.skillId;
            const shadowId = `${sid}@${projectRoot}`;
            shadowRegistry.updateStatus(shadowId, 'active');
            unfrozenCount++;
          }

          cliInfo(`✅ Successfully unfroze ${unfrozenCount} shadow skill(s)`);
          cliInfo('\nAutomatic optimization has been resumed for all skills.');
          shadowRegistry.close();
          return;
        }

        // 单个 skill 操作
        // 验证 skill ID 格式
        if (!validateSkillId(skillId)) {
          cliError(
            `Error: Invalid skill ID "${skillId}". Skill IDs can only contain letters, numbers, hyphens, underscores, and dots.`
          );
          process.exit(1);
        }

        // 检查 shadow 是否存在
        const shadow = shadowRegistry.get(skillId);
        if (!shadow) {
          cliError(`Error: Shadow skill "${skillId}" not found`);
          process.exit(1);
        }

        // 检查是否已经是 active
        if (shadow.status === 'active') {
          cliInfo(`Skill "${skillId}" is already active.`);
          shadowRegistry.close();
          return;
        }

        // Dry run 预览
        if (options.dryRun) {
          showDryRunPreview('Unfreeze Skill', [
            {
              id: skillId,
              currentState: shadow.status,
              newState: 'active',
            },
          ]);
          shadowRegistry.close();
          return;
        }

        // 用户确认
        if (!options.force) {
          const inquirer = await import('inquirer').then((m) => m.default || m);
          cliInfo(`\n⚠️  Warning: This will unfreeze "${skillId}"`);
          cliInfo('   Automatic optimization will resume for this skill.');
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
            cliInfo('Unfreeze cancelled.');
            shadowRegistry.close();
            return;
          }
        }

        // 更新状态为 active
        const shadowId = `${skillId}@${projectRoot}`;
        shadowRegistry.updateStatus(shadowId, 'active');

        cliInfo(`✅ Shadow skill "${skillId}" has been unfrozen`);
        cliInfo('Automatic optimization is now resumed for this skill');

        // 关闭
        shadowRegistry.close();
      } catch (error) {
        cliError(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  return unfreeze;
}

/**
 * 批量解冻技能
 */
async function unfreezeMultipleSkills(
  skillIds: string[],
  _shadows: Array<{ skill_id?: string; skillId?: string; status?: string }>,
  projectRoot: string,
  shadowRegistry: ReturnType<typeof createShadowRegistry>,
  options: FreezeOptions
): Promise<void> {
  // Dry run 预览
  if (options.dryRun) {
    const preview = skillIds.map((id) => ({
      id,
      currentState: 'frozen',
      newState: 'active',
    }));
    showDryRunPreview('Unfreeze Skills', preview);
    shadowRegistry.close();
    return;
  }

  // 用户确认
  if (!options.force) {
    const inquirer = await import('inquirer').then((m) => m.default || m);
    cliInfo(`\n⚠️  Warning: This will unfreeze ${skillIds.length} shadow skill(s)`);
    cliInfo('   Unfrozen skills will resume receiving automatic optimizations.');
    cliInfo('');

    const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
      {
        type: 'confirm',
        name: 'confirmed',
        message: `Are you sure you want to unfreeze these skills?`,
        default: false,
      },
    ]);

    if (!confirmed) {
      cliInfo('Unfreeze cancelled.');
      shadowRegistry.close();
      return;
    }
  }

  let unfrozenCount = 0;
  for (const id of skillIds) {
    const shadowId = `${id}@${projectRoot}`;
    shadowRegistry.updateStatus(shadowId, 'active');
    unfrozenCount++;
  }

  cliInfo(`✅ Successfully unfroze ${unfrozenCount} shadow skill(s)`);
  shadowRegistry.close();
}
