/**
 * Config Command
 * Manage OrnnSkills configuration
 */

import { Command } from 'commander';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { runConfigWizard } from '../../config/wizard.js';
import {
  listConfiguredProviders,
  getDefaultProvider,
  setDefaultProvider,
} from '../../config/manager.js';
import { logger } from '../../utils/logger.js';

interface ConfigOptions {
  project?: string;
  list?: boolean;
  use?: string;
}

/**
 * Create the config command
 */
export function createConfigCommand(): Command {
  const config = new Command('config');

  config
    .description('Manage OrnnSkills configuration')
    .option('-p, --project <path>', 'Project root path', process.cwd())
    .option('-l, --list', 'List all configured providers', false)
    .option('-u, --use <provider>', 'Set default provider', '')
    .action(async (options: ConfigOptions) => {
      try {
        const projectPath = options.project || process.cwd();
        const ornnDir = join(projectPath, '.ornn');

        // Check if project is initialized
        if (!existsSync(ornnDir)) {
          logger.error('Project not initialized. Run "ornn init" first.');
          process.exit(1);
        }

        // Handle list option
        if (options.list) {
          const providers = await listConfiguredProviders(projectPath);
          const defaultProvider = await getDefaultProvider(projectPath);

          if (providers.length === 0) {
            logger.info('No providers configured yet.');
            logger.info('Run "ornn config" to add a provider.');
            return;
          }

          logger.info('📋 Configured providers:');
          for (const provider of providers) {
            const isDefault = provider.provider === defaultProvider;
            logger.info(
              `  ${isDefault ? '✓' : ' '} ${provider.provider} (${provider.modelName})${isDefault ? ' [default]' : ''}`
            );
          }
          return;
        }

        // Handle use option (set default)
        if (options.use) {
          const success = await setDefaultProvider(projectPath, options.use);
          if (success) {
            logger.info(`✓ Default provider set to: ${options.use}`);
          } else {
            process.exit(1);
          }
          return;
        }

        // Run configuration wizard
        await runConfigWizard(projectPath);

        logger.info('\n✅ Configuration updated successfully!');
      } catch (error) {
        logger.error('Failed to update configuration:', error);
        process.exit(1);
      }
    });

  return config;
}
