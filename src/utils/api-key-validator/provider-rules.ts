import { getProviderConfig } from '../../config/providers.js';

export type ProviderValidationMode =
  | 'chat_completions'
  | 'anthropic_messages'
  | 'gemini_generate_content'
  | 'alibaba_generation'
  | 'cohere_chat'
  | 'replicate_models'
  | 'skip';

export interface ProviderValidationPlan {
  provider: string;
  providerName: string;
  mode: ProviderValidationMode;
  endpoint?: string;
  model?: string;
  authHeader?: string;
  authScheme?: 'Bearer' | 'Token' | 'raw' | 'query';
  headers?: Record<string, string>;
  skipMessage?: string;
}

export interface ProviderFormatRules {
  minLength: number;
  prefixes?: string[];
}

type ProviderValidationPlanOverride = Omit<ProviderValidationPlan, 'provider' | 'providerName'>;

const PROVIDER_VALIDATION_PLANS: Record<string, ProviderValidationPlanOverride> = {
  deepseek: {
    mode: 'chat_completions',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    authHeader: 'Authorization',
    authScheme: 'Bearer',
  },
  openai: {
    mode: 'chat_completions',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo',
    authHeader: 'Authorization',
    authScheme: 'Bearer',
  },
  anthropic: {
    mode: 'anthropic_messages',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-haiku',
    authHeader: 'x-api-key',
    authScheme: 'raw',
    headers: {
      'anthropic-version': '2023-06-01',
    },
  },
  gemini: {
    mode: 'gemini_generate_content',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    authScheme: 'query',
  },
  alibaba: {
    mode: 'alibaba_generation',
    endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    model: 'qwen-turbo',
    authHeader: 'Authorization',
    authScheme: 'Bearer',
  },
  groq: {
    mode: 'chat_completions',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama3-8b-8192',
    authHeader: 'Authorization',
    authScheme: 'Bearer',
  },
  mistral: {
    mode: 'chat_completions',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-small',
    authHeader: 'Authorization',
    authScheme: 'Bearer',
  },
  cohere: {
    mode: 'cohere_chat',
    endpoint: 'https://api.cohere.com/v1/chat',
    model: 'command-r',
    authHeader: 'Authorization',
    authScheme: 'Bearer',
  },
  together_ai: {
    mode: 'chat_completions',
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    model: 'meta-llama/Llama-3-8b',
    authHeader: 'Authorization',
    authScheme: 'Bearer',
  },
  perplexity: {
    mode: 'chat_completions',
    endpoint: 'https://api.perplexity.ai/chat/completions',
    model: 'sonar',
    authHeader: 'Authorization',
    authScheme: 'Bearer',
  },
  fireworks_ai: {
    mode: 'chat_completions',
    endpoint: 'https://api.fireworks.ai/inference/v1/chat/completions',
    model: 'accounts/fireworks/models/llama-v3p1-8b-instruct',
    authHeader: 'Authorization',
    authScheme: 'Bearer',
  },
  openrouter: {
    mode: 'chat_completions',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3.1-8b',
    authHeader: 'Authorization',
    authScheme: 'Bearer',
  },
  ai21: {
    mode: 'chat_completions',
    endpoint: 'https://api.ai21.com/studio/v1/chat/completions',
    model: 'jamba-1.5-mini',
    authHeader: 'Authorization',
    authScheme: 'Bearer',
  },
  replicate: {
    mode: 'replicate_models',
    endpoint: 'https://api.replicate.com/v1/models',
    authHeader: 'Authorization',
    authScheme: 'Token',
  },
  azure: {
    mode: 'skip',
    skipMessage: 'Azure OpenAI uses complex authentication. Please ensure your credentials are configured correctly.',
  },
  vertex_ai: {
    mode: 'skip',
    skipMessage: 'Vertex AI (Google Cloud) uses complex authentication. Please ensure your credentials are configured correctly.',
  },
  bedrock: {
    mode: 'skip',
    skipMessage: 'AWS Bedrock uses complex authentication. Please ensure your credentials are configured correctly.',
  },
};

const PROVIDER_FORMAT_RULES: Record<string, ProviderFormatRules> = {
  openai: { minLength: 10, prefixes: ['sk-'] },
  anthropic: { minLength: 10, prefixes: ['sk-ant-'] },
  gemini: { minLength: 10, prefixes: ['AIza'] },
  groq: { minLength: 10, prefixes: ['gsk_'] },
  perplexity: { minLength: 10, prefixes: ['pplx-'] },
  openrouter: { minLength: 10, prefixes: ['sk-or-'] },
  replicate: { minLength: 10, prefixes: ['r8_'] },
  mistral: { minLength: 20 },
  deepseek: { minLength: 20 },
  alibaba: { minLength: 20 },
  cohere: { minLength: 20 },
  together_ai: { minLength: 20 },
  fireworks_ai: { minLength: 20 },
  ai21: { minLength: 20 },
  azure: { minLength: 20 },
  vertex_ai: { minLength: 20 },
  bedrock: { minLength: 20 },
};

export function getProviderValidationPlan(provider: string): ProviderValidationPlan | null {
  const providerConfig = getProviderConfig(provider);
  if (!providerConfig) {
    return null;
  }

  const override = PROVIDER_VALIDATION_PLANS[provider];
  if (override) {
    return {
      provider,
      providerName: providerConfig.name,
      ...override,
    };
  }

  return {
    provider,
    providerName: providerConfig.name,
    mode: 'skip',
    skipMessage: `API key validation not implemented for ${providerConfig.name}. Skipping validation.`,
  };
}

export function getProviderFormatRules(provider: string): ProviderFormatRules | null {
  const providerConfig = getProviderConfig(provider);
  if (!providerConfig) {
    return null;
  }

  return PROVIDER_FORMAT_RULES[provider] ?? { minLength: 20 };
}
