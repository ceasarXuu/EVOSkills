import { Command } from 'commander';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createShadowRegistry } from '../../core/shadow-registry/index.js';
import { createJournalManager } from '../../core/journal/index.js';

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
    .action(async (skillId: string, options) => {
      try {
        const projectRoot = options.project;

        // 检查 .sea 目录是否存在
        const seaDir = join(projectRoot, '.sea');
        if (!existsSync(seaDir)) {
          console.error('Error: .sea directory not found. Is this a SEA project?');
          process.exit(1);
        }

        // 初始化组件
        const shadowRegistry = createShadowRegistry(projectRoot);
        const journalManager = createJournalManager(projectRoot);

        await shadowRegistry.init();
        await journalManager.init();

        // 检查 shadow 是否存在
        const shadow = await shadowRegistry.get(skillId);
        if (!shadow) {
          console.error(`Error: Shadow skill "${skillId}" not found`);
          process.exit(1);
        }

        const shadowId = `${skillId}@${projectRoot}`;

        // 确定回滚目标
        if (options.initial) {
          // 回滚到初始版本
          console.log(`Rolling back "${skillId}" to initial version...`);
          await journalManager.rollback(shadowId, 0);
          console.log(`✅ Successfully rolled back to initial version`);
        } else if (options.snapshot) {
          // 回滚到最新 snapshot
          console.log(`Rolling back "${skillId}" to latest snapshot...`);
          await journalManager.rollbackToSnapshot(shadowId);
          console.log(`✅ Successfully rolled back to latest snapshot`);
        } else if (options.to) {
          // 回滚到指定 revision
          const targetRevision = parseInt(options.to, 10);
          if (isNaN(targetRevision)) {
            console.error('Error: Invalid revision number');
            process.exit(1);
          }

          console.log(`Rolling back "${skillId}" to revision ${targetRevision}...`);
          await journalManager.rollback(shadowId, targetRevision);
          console.log(`✅ Successfully rolled back to revision ${targetRevision}`);
        } else {
          // 显示可用的 revisions
          console.log(`Available snapshots for "${skillId}":\n`);
          const snapshots = journalManager.getSnapshots(shadowId);

          if (snapshots.length === 0) {
            console.log('No snapshots available');
          } else {
            for (const snapshot of snapshots) {
              console.log(`  rev_${String(snapshot.revision).padStart(4, '0')} - ${snapshot.timestamp}`);
            }
          }

          console.log('\nUsage:');
          console.log(`  sea skills rollback ${skillId} --to <revision>`);
          console.log(`  sea skills rollback ${skillId} --snapshot`);
          console.log(`  sea skills rollback ${skillId} --initial`);
        }

        // 关闭
        shadowRegistry.close();
        journalManager.close();
      } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
      }
    });

  return rollback;
}