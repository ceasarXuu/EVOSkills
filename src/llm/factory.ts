/**
 * LLM Factory for creating LLM instances
 * Using LiteLLM client for unified API access
 */

import type { LLMRequestGuard, LLMSafetyOptions } from './request-guard.js';
import { LiteLLMClient, createLiteLLMClient } from './litellm-client.js';

export interface LLMConfig {
  provider: string;
  modelName: string;
  apiKey: string;
  maxTokens?: number;
  safety?: Partial<LLMSafetyOptions>;
  requestGuard?: LLMRequestGuard;
}

export interface LLMInstance {
  provider: string;
  modelName: string;
  apiKey: string;
  maxTokens: number;
  complete(prompt: string): Promise<string>;
}

const DEFAULT_MAX_TOKENS = 4000;
const EXECUTOR_MAX_TOKENS = 2000;

/**
 * Create LLM instance using LiteLLM client
 */
export function createLLM(config: LLMConfig): LiteLLMClient {
  return createLiteLLMClient(config);
}

/**
 * Predefined configurations (without apiKey, to be filled at runtime)
 */
export const ANALYZER_CONFIG: Omit<LLMConfig, 'apiKey'> = {
  provider: "deepseek",
  modelName: "deepseek-reasoner",
  maxTokens: DEFAULT_MAX_TOKENS,
};

export const EXECUTOR_CONFIG: Omit<LLMConfig, 'apiKey'> = {
  provider: "deepseek",
  modelName: "deepseek-chat",
  maxTokens: EXECUTOR_MAX_TOKENS,
};

/**
 * Load LLM config from environment or config file
 */
export function loadLLMConfigFromEnv(): LLMConfig {
  const provider = process.env.ORNN_LLM_PROVIDER || "deepseek";
  const modelName = process.env.ORNN_LLM_MODEL || "deepseek-reasoner";
  const apiKey = process.env.ORNN_LLM_API_KEY || "";

  if (!apiKey) {
    throw new Error(
      `LLM API key not found for provider "${provider}". ` +
      'Please set the environment variable ' +
      (provider === 'deepseek' ? 'DEEPSEEK_API_KEY' : `${provider.toUpperCase()}_API_KEY`) +
      ', or run "ornn config" to configure your LLM provider.'
    );
  }

  return {
    provider,
    modelName,
    apiKey,
    maxTokens: DEFAULT_MAX_TOKENS,
  };
}
