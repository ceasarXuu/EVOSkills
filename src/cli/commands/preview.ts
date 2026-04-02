import { Command } from 'commander';
import { cliInfo } from '../../utils/cli-output.js';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createShadowRegistry } from '../../core/shadow-registry/index.js';
import { createJournalManager } from '../../core/journal/index.js';
import { validateSkillId, validateProjectPath } from '../../utils/path.js';
import { printErrorAndExit } from '../../utils/error-helper.js';

interface PreviewOptions {
  project: string;
  revision?: string;
}

export function createPreviewCommand(): Command {
  const preview = new Command('preview');

  preview
    .description('Preview changes that would be applied to a shadow skill')
    .argument('<skill>', 'Skill ID to preview')
    .option('-r, --revision <rev>', 'Preview changes from specific revision')
    .option('-p, --project <path>', 'Project root path', process.cwd())
    .action(async (skillId: string, options: PreviewOptions) => {
      try {
        if (!validateSkillId(skillId)) {
          printErrorAndExit(
            'Invalid skill ID "' +
              skillId +
              '". Skill IDs can only contain letters, numbers, hyphens, underscores, and dots.',
            { operation: 'Validate skill ID', skillId, projectPath: options.project },
            'INVALID_SKILL_ID'
          );
        }

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

        const ornnDir = join(projectRoot, '.ornn');
        if (!existsSync(ornnDir)) {
          printErrorAndExit(
            '.ornn directory not found. Run "ornn init" first.',
            { operation: 'Check project initialization', projectPath: projectRoot },
            'PROJECT_NOT_INITIALIZED'
          );
        }

        const shadowRegistry = createShadowRegistry(projectRoot);
        const journalManager = createJournalManager(projectRoot);

        shadowRegistry.init();
        await journalManager.init();

        const shadow = shadowRegistry.get(skillId);
        if (!shadow) {
          printErrorAndExit(
            'Shadow skill "' + skillId + '" not found',
            { operation: 'Preview skill', skillId, projectPath: options.project },
            'SKILL_NOT_FOUND'
          );
        }

        const shadowId = skillId + '@' + projectRoot;
        const latestRevision = journalManager.getLatestRevision(shadowId);
        const records = journalManager.getJournalRecords(shadowId, { limit: 10 });

        cliInfo('');
        cliInfo('  Preview for Shadow Skill: ' + skillId);
        cliInfo('');
        cliInfo('   Current Revision: ' + latestRevision);
        cliInfo('   Status: ' + shadow.status);
        cliInfo('   Last Optimized: ' + (shadow.last_optimized_at || 'Never'));
        cliInfo('');

        if (records.length === 0) {
          cliInfo('   No optimization history found.');
          cliInfo('   This skill has not been optimized yet.');
          cliInfo('');
          shadowRegistry.close();
          await journalManager.close();
          return;
        }

        cliInfo('  Recent Optimization History:');
        cliInfo('');

        const recentRecords = records.slice(0, 5);
        for (const record of recentRecords as Array<{
          revision: number;
          timestamp: string;
          change_type: string;
          reason: string;
          applied_by: string;
        }>) {
          const date = new Date(record.timestamp).toLocaleString();
          const type = record.change_type.toUpperCase().padEnd(20);
          const appliedBy = record.applied_by === 'auto' ? 'Auto' : 'Manual';

          cliInfo('   rev_' + String(record.revision).padStart(4, '0') + ' - ' + date);
          cliInfo('      Type: ' + type + ' | By: ' + appliedBy);
          cliInfo('      Reason: ' + record.reason);
          cliInfo('');
        }

        cliInfo('  Optimization Suggestions:');
        cliInfo('');
        cliInfo('   Based on recent usage patterns, potential optimizations:');
        cliInfo('');

        const changeTypeCounts: Record<string, number> = {};
        for (const record of records as Array<{ change_type: string }>) {
          changeTypeCounts[record.change_type] = (changeTypeCounts[record.change_type] || 0) + 1;
        }

        const suggestions: string[] = [];
        if (changeTypeCounts['append_context'] > 0) {
          suggestions.push('   - APPEND_CONTEXT: Consider adding more project-specific context');
        }
        if (changeTypeCounts['tighten_trigger'] > 0) {
          suggestions.push('   - TIGHTEN_TRIGGER: Review trigger conditions for better precision');
        }
        if (changeTypeCounts['add_fallback'] > 0) {
          suggestions.push('   - ADD_FALLBACK: Ensure common error cases have fallbacks');
        }
        if (changeTypeCounts['prune_noise'] > 0) {
          suggestions.push('   - PRUNE_NOISE: Remove low-value content periodically');
        }

        if (suggestions.length === 0) {
          cliInfo('   - No specific suggestions at this time');
          cliInfo('   - The skill appears to be well-optimized');
          cliInfo('');
        } else {
          for (const suggestion of suggestions) {
            cliInfo(suggestion);
          }
        }

        cliInfo('');
        cliInfo('  Next Steps:');
        cliInfo('');
        cliInfo('   To view detailed diff between versions:');
        cliInfo('     $ ornn skills diff ' + skillId + ' --from <revision>');
        cliInfo('');
        cliInfo('   To trigger a new optimization analysis:');
        cliInfo('     $ ornn optimize ' + skillId);
        cliInfo('');
        cliInfo('   To freeze automatic optimizations:');
        cliInfo('     $ ornn skills freeze ' + skillId);
        cliInfo('');

        shadowRegistry.close();
        await journalManager.close();
      } catch (error) {
        printErrorAndExit(
          error instanceof Error ? error.message : String(error),
          { operation: 'Preview skill', skillId },
          undefined
        );
      }
    });

  return preview;
}
