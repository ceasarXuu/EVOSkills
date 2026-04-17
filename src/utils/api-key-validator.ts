/**
 * API Key Validator
 * Validates API keys by making test requests to providers.
 */

import { getProviderApiKeyEnvVar, getProviderConfig } from '../config/providers.js';
import { logger } from './logger.js';
import { getProviderFormatRules, getProviderValidationPlan } from './api-key-validator/provider-rules.js';
import type { ValidationResult } from './api-key-validator/types.js';
import { validateProviderApiKey } from './api-key-validator/validators.js';

export type { ValidationResult } from './api-key-validator/types.js';

export async function validateApiKey(
  provider: string,
  apiKey: string,
): Promise<ValidationResult> {
  const providerConfig = getProviderConfig(provider);
  if (!providerConfig) {
    logger.warn(`Unknown provider "${provider}". Attempting generic validation...`);
    return {
      valid: true,
      message: `Provider "${provider}" is not explicitly supported. Skipping validation.`,
      details: { provider },
    };
  }

  logger.info(`Validating ${providerConfig.name} API key...`);

  const plan = getProviderValidationPlan(provider);
  if (!plan) {
    return {
      valid: true,
      message: `API key validation not implemented for ${providerConfig.name}. Skipping validation.`,
      details: { provider },
    };
  }

  return validateProviderApiKey(plan, apiKey);
}

export function isValidApiKeyFormat(provider: string, apiKey: string): boolean {
  if (!apiKey || apiKey.length < 10) {
    return false;
  }

  const formatRules = getProviderFormatRules(provider);
  if (!formatRules) {
    return true;
  }

  if (formatRules.prefixes?.length) {
    return formatRules.prefixes.some((prefix) => apiKey.startsWith(prefix));
  }

  return apiKey.length >= formatRules.minLength;
}

export function getApiKeyFormatHint(provider: string): string {
  const providerConfig = getProviderConfig(provider);
  if (providerConfig?.apiKeyFormat) {
    return `${providerConfig.name} API keys should be in format: ${providerConfig.apiKeyFormat}`;
  }

  const formatRules = getProviderFormatRules(provider);
  if (!formatRules) {
    return 'API key should be at least 20 characters';
  }

  if (formatRules.prefixes?.length) {
    return `API keys should start with ${formatRules.prefixes.map((prefix) => `'${prefix}'`).join(' or ')}`;
  }

  return `API key should be at least ${formatRules.minLength} characters`;
}

export function getApiKeyEnvVar(provider: string): string {
  return getProviderApiKeyEnvVar(provider);
}
