/**
 * Configuration Wizard for first-time setup
 */

import { logger } from '../utils/logger.js';
import { cliInfo } from '../utils/cli-output.js';
import { SUPPORTED_PROVIDERS, getProviderConfig } from './providers.js';
import {
  writeConfig,
  writeEnvFile,
  listConfiguredProviders,
  getDefaultProvider,
  type ProviderConfig,
} from './manager.js';
import {
  validateApiKey,
  isValidApiKeyFormat,
  getApiKeyFormatHint,
} from '../utils/api-key-validator.js';

export async function runConfigWizard(projectPath: string): Promise<void> {
  logger.info('🚀 Ornn Skills - Configuration Wizard\n');

  // Dynamically import inquirer to avoid ESM issues
  const inquirer = await import('inquirer').then((m) => m.default || m);

  // Show existing providers
  const existingProviders = await listConfiguredProviders(projectPath);
  const currentDefault = await getDefaultProvider(projectPath);

  if (existingProviders.length > 0) {
    logger.info('📋 Currently configured providers:');
    for (const provider of existingProviders) {
      const isDefault = provider.provider === currentDefault;
      logger.info(
        `  ${isDefault ? '✓' : ' '} ${provider.provider} (${provider.modelName})${isDefault ? ' [default]' : ''}`
      );
    }
    cliInfo('');
  }

  // Step 1: Select provider with smart default
  const { provider } = (await inquirer.prompt({
    type: 'select',
    name: 'provider',
    message: 'Select LLM Provider to configure:',
    default: 'deepseek',
    choices: SUPPORTED_PROVIDERS.map((p) => ({
      name: `${p.name} (${p.apiKeyUrl})`,
      value: p.id,
    })),
  })) as { provider: string };

  // Check if provider already exists
  const isUpdate = existingProviders.some((p) => p.provider === provider);
  if (isUpdate) {
    logger.info(`\n📝 Updating existing provider: ${provider}`);
  }

  // Step 2: Select model based on provider with smart default
  const providerConfig = getProviderConfig(provider);
  if (!providerConfig) {
    throw new Error(`Unknown provider: ${provider}. Please select a valid provider.`);
  }

  const { modelName } = (await inquirer.prompt({
    type: 'select',
    name: 'modelName',
    message: isUpdate ? 'Select new model:' : 'Select Model:',
    default: providerConfig.defaultModel,
    choices: providerConfig.models.map((model) => ({
      name: model,
      value: model,
    })),
  })) as { modelName: string };

  // Step 3: Enter API key with validation
  let apiKey = '';
  let isValidKey = false;

  while (!isValidKey) {
    const response: { apiKey: string; validateKey: boolean } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: isUpdate ? 'Enter new API Key:' : 'Enter API Key:',
        mask: '*',
        validate: (input: string): boolean | string => {
          if (!input || input.length < 10) {
            return 'Please enter a valid API key (at least 10 characters)';
          }
          // Basic format validation based on provider
          if (!isValidApiKeyFormat(provider, input)) {
            return getApiKeyFormatHint(provider);
          }
          return true;
        },
      },
      {
        type: 'confirm',
        name: 'validateKey',
        message: 'Validate API key with provider? (requires internet connection)',
        default: true,
      },
    ]);

    apiKey = response.apiKey;

    if (response.validateKey) {
      const validationResult = await validateApiKey(provider, apiKey);
      if (validationResult.valid) {
        logger.info(`✅ ${validationResult.message}`);
        isValidKey = true;
      } else {
        logger.warn(`⚠️  ${validationResult.message}`);
        const { retry } = (await inquirer.prompt({
          type: 'confirm',
          name: 'retry',
          message: 'Would you like to re-enter the API key?',
          default: true,
        })) as { retry: boolean };
        if (!retry) {
          const { proceed } = (await inquirer.prompt({
            type: 'confirm',
            name: 'proceed',
            message: 'Continue without validation? (The key may not work)',
            default: false,
          })) as { proceed: boolean };
          if (proceed) {
            isValidKey = true;
          }
        }
      }
    } else {
      // Skip validation
      isValidKey = true;
    }
  }

  // Step 4: Ask if this should be the default provider
  let setAsDefault = false;
  if (existingProviders.length > 0) {
    const { shouldBeDefault } = (await inquirer.prompt({
      type: 'confirm',
      name: 'shouldBeDefault',
      message: `Set "${provider}" as the default provider?`,
      default: !isUpdate,
    })) as { shouldBeDefault: boolean };
    setAsDefault = shouldBeDefault;
  } else {
    setAsDefault = true; // First provider is always default
  }

  // Step 5: Write config (append/update provider)
  const providerConfigData: ProviderConfig = {
    provider,
    modelName,
    apiKeyEnvVar: `ORNN_${provider.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_API_KEY`,
  };

  await writeConfig(projectPath, providerConfigData, setAsDefault);
  logger.info(`✓ Configuration ${isUpdate ? 'updated' : 'saved'} to .ornn/config/settings.toml`);

  // Step 6: Write API key to .env.local
  await writeEnvFile(projectPath, provider, apiKey);
  logger.info(`✓ API key saved to .env.local`);

  // Display summary
  logger.info('\n📊 Configuration Summary:');
  const updatedProviders = await listConfiguredProviders(projectPath);
  const newDefault = await getDefaultProvider(projectPath);

  for (const p of updatedProviders) {
    const isDefault = p.provider === newDefault;
    logger.info(
      `  ${isDefault ? '✓' : ' '} ${p.provider} (${p.modelName})${isDefault ? ' [default]' : ''}`
    );
  }

  // Step 7: Display security notice
  logger.info('\n⚠️  Security Notice:');
  logger.info('   Your API key has been saved to .env.local');
  logger.info('   Make sure to add .env.local to your .gitignore!');
  logger.info('\n   To load the environment variables, run:');
  logger.info(`   source .env.local`);
}
