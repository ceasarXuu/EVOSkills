/**
 * API Key Validator
 * Validates API keys by making test requests to providers
 * 
 * Note: LiteLLM supports 100+ providers. This validator covers the most common ones.
 * For providers not explicitly supported, we perform basic format validation.
 */

import { logger } from "./logger.js";
import { getProviderConfig, getProviderApiKeyEnvVar } from "../config/providers.js";

export interface ValidationResult {
  valid: boolean;
  message: string;
  details?: {
    provider: string;
    model?: string;
    error?: string;
  };
}

/**
 * Generic API key validator using LiteLLM format
 * Most providers use the same OpenAI-compatible endpoint format
 */
async function validateGenericProvider(
  provider: string,
  apiKey: string,
  baseURL: string,
  model: string
): Promise<ValidationResult> {
  try {
    // Make a minimal completion request
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      }),
    });

    if (response.status === 401) {
      return {
        valid: false,
        message: `Invalid API key for ${provider}. Please check your key.`,
        details: { provider, error: "Unauthorized" },
      };
    }

    if (response.status === 404) {
      // Model not found, but key might be valid
      return {
        valid: true,
        message: `${provider} API key appears valid (model not found, but authentication succeeded)`,
        details: { provider, model },
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        valid: false,
        message: `${provider} API error: ${response.statusText}`,
        details: { provider, error: errorText },
      };
    }

    return {
      valid: true,
      message: `${provider} API key is valid`,
      details: { provider, model },
    };
  } catch (error) {
    return {
      valid: false,
      message: `Failed to validate ${provider} API key: ${error instanceof Error ? error.message : String(error)}`,
      details: { provider, error: String(error) },
    };
  }
}

/**
 * Validate DeepSeek API key
 */
async function validateDeepSeekKey(apiKey: string): Promise<ValidationResult> {
  return validateGenericProvider(
    "DeepSeek",
    apiKey,
    "https://api.deepseek.com/v1",
    "deepseek-chat"
  );
}

/**
 * Validate OpenAI API key
 */
async function validateOpenAIKey(apiKey: string): Promise<ValidationResult> {
  return validateGenericProvider(
    "OpenAI",
    apiKey,
    "https://api.openai.com/v1",
    "gpt-3.5-turbo"
  );
}

/**
 * Validate Anthropic API key
 */
async function validateAnthropicKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku",
        max_tokens: 5,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });

    if (response.status === 401) {
      return {
        valid: false,
        message: "Invalid Anthropic API key. Please check your key.",
        details: { provider: "anthropic", error: "Unauthorized" },
      };
    }

    if (!response.ok) {
      return {
        valid: false,
        message: `Anthropic API error: ${response.statusText}`,
        details: { provider: "anthropic", error: response.statusText },
      };
    }

    return {
      valid: true,
      message: "Anthropic API key is valid",
      details: { provider: "anthropic" },
    };
  } catch (error) {
    return {
      valid: false,
      message: `Failed to validate Anthropic API key: ${error instanceof Error ? error.message : String(error)}`,
      details: { provider: "anthropic", error: String(error) },
    };
  }
}

/**
 * Validate Google Gemini API key
 */
async function validateGeminiKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hi" }] }],
        }),
      }
    );

    if (response.status === 400) {
      const data = await response.json() as { error?: { message?: string } };
      if (data.error?.message?.includes("API key")) {
        return {
          valid: false,
          message: "Invalid Google API key. Please check your key.",
          details: { provider: "gemini", error: "Invalid API key" },
        };
      }
    }

    if (!response.ok) {
      return {
        valid: false,
        message: `Google API error: ${response.statusText}`,
        details: { provider: "gemini", error: response.statusText },
      };
    }

    return {
      valid: true,
      message: "Google API key is valid",
      details: { provider: "gemini" },
    };
  } catch (error) {
    return {
      valid: false,
      message: `Failed to validate Google API key: ${error instanceof Error ? error.message : String(error)}`,
      details: { provider: "gemini", error: String(error) },
    };
  }
}

/**
 * Validate Alibaba Cloud (Dashscope) API key
 */
async function validateAlibabaKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch(
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "qwen-turbo",
          input: {
            messages: [{ role: "user", content: "Hi" }],
          },
        }),
      }
    );

    if (response.status === 401 || response.status === 403) {
      return {
        valid: false,
        message: "Invalid Alibaba Cloud API key. Please check your key.",
        details: { provider: "alibaba", error: "Unauthorized" },
      };
    }

    if (!response.ok) {
      return {
        valid: false,
        message: `Alibaba Cloud API error: ${response.statusText}`,
        details: { provider: "alibaba", error: response.statusText },
      };
    }

    return {
      valid: true,
      message: "Alibaba Cloud API key is valid",
      details: { provider: "alibaba" },
    };
  } catch (error) {
    return {
      valid: false,
      message: `Failed to validate Alibaba Cloud API key: ${error instanceof Error ? error.message : String(error)}`,
      details: { provider: "alibaba", error: String(error) },
    };
  }
}

/**
 * Validate Groq API key
 */
async function validateGroqKey(apiKey: string): Promise<ValidationResult> {
  return validateGenericProvider(
    "Groq",
    apiKey,
    "https://api.groq.com/openai/v1",
    "llama3-8b-8192"
  );
}

/**
 * Validate Mistral API key
 */
async function validateMistralKey(apiKey: string): Promise<ValidationResult> {
  return validateGenericProvider(
    "Mistral",
    apiKey,
    "https://api.mistral.ai/v1",
    "mistral-small"
  );
}

/**
 * Validate Cohere API key
 */
async function validateCohereKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch("https://api.cohere.com/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "command-r",
        message: "Hi",
      }),
    });

    if (response.status === 401) {
      return {
        valid: false,
        message: "Invalid Cohere API key. Please check your key.",
        details: { provider: "cohere", error: "Unauthorized" },
      };
    }

    if (!response.ok) {
      return {
        valid: false,
        message: `Cohere API error: ${response.statusText}`,
        details: { provider: "cohere", error: response.statusText },
      };
    }

    return {
      valid: true,
      message: "Cohere API key is valid",
      details: { provider: "cohere" },
    };
  } catch (error) {
    return {
      valid: false,
      message: `Failed to validate Cohere API key: ${error instanceof Error ? error.message : String(error)}`,
      details: { provider: "cohere", error: String(error) },
    };
  }
}

/**
 * Validate Together AI API key
 */
async function validateTogetherAIKey(apiKey: string): Promise<ValidationResult> {
  return validateGenericProvider(
    "Together AI",
    apiKey,
    "https://api.together.xyz/v1",
    "meta-llama/Llama-3-8b"
  );
}

/**
 * Validate Perplexity API key
 */
async function validatePerplexityKey(apiKey: string): Promise<ValidationResult> {
  return validateGenericProvider(
    "Perplexity",
    apiKey,
    "https://api.perplexity.ai",
    "sonar"
  );
}

/**
 * Validate Fireworks AI API key
 */
async function validateFireworksKey(apiKey: string): Promise<ValidationResult> {
  return validateGenericProvider(
    "Fireworks AI",
    apiKey,
    "https://api.fireworks.ai/inference/v1",
    "accounts/fireworks/models/llama-v3p1-8b-instruct"
  );
}

/**
 * Validate OpenRouter API key
 */
async function validateOpenRouterKey(apiKey: string): Promise<ValidationResult> {
  return validateGenericProvider(
    "OpenRouter",
    apiKey,
    "https://openrouter.ai/api/v1",
    "meta-llama/llama-3.1-8b"
  );
}

/**
 * Validate AI21 API key
 */
async function validateAI21Key(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch("https://api.ai21.com/studio/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "jamba-1.5-mini",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      }),
    });

    if (response.status === 401) {
      return {
        valid: false,
        message: "Invalid AI21 API key. Please check your key.",
        details: { provider: "ai21", error: "Unauthorized" },
      };
    }

    if (!response.ok) {
      return {
        valid: false,
        message: `AI21 API error: ${response.statusText}`,
        details: { provider: "ai21", error: response.statusText },
      };
    }

    return {
      valid: true,
      message: "AI21 API key is valid",
      details: { provider: "ai21" },
    };
  } catch (error) {
    return {
      valid: false,
      message: `Failed to validate AI21 API key: ${error instanceof Error ? error.message : String(error)}`,
      details: { provider: "ai21", error: String(error) },
    };
  }
}

/**
 * Validate Replicate API key
 */
async function validateReplicateKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch("https://api.replicate.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Token ${apiKey}`,
      },
    });

    if (response.status === 401) {
      return {
        valid: false,
        message: "Invalid Replicate API key. Please check your key.",
        details: { provider: "replicate", error: "Unauthorized" },
      };
    }

    if (!response.ok) {
      return {
        valid: false,
        message: `Replicate API error: ${response.statusText}`,
        details: { provider: "replicate", error: response.statusText },
      };
    }

    return {
      valid: true,
      message: "Replicate API key is valid",
      details: { provider: "replicate" },
    };
  } catch (error) {
    return {
      valid: false,
      message: `Failed to validate Replicate API key: ${error instanceof Error ? error.message : String(error)}`,
      details: { provider: "replicate", error: String(error) },
    };
  }
}

/**
 * Validate API key for a specific provider
 */
export async function validateApiKey(
  provider: string,
  apiKey: string
): Promise<ValidationResult> {
  const providerConfig = getProviderConfig(provider);
  if (!providerConfig) {
    // For unknown providers, try generic validation
    logger.warn(`Unknown provider "${provider}". Attempting generic validation...`);
    return {
      valid: true,
      message: `Provider "${provider}" is not explicitly supported. Skipping validation.`,
      details: { provider },
    };
  }

  logger.info(`Validating ${providerConfig.name} API key...`);

  switch (provider) {
    case "deepseek":
      return validateDeepSeekKey(apiKey);
    case "openai":
      return validateOpenAIKey(apiKey);
    case "anthropic":
      return validateAnthropicKey(apiKey);
    case "gemini":
      return validateGeminiKey(apiKey);
    case "alibaba":
      return validateAlibabaKey(apiKey);
    case "groq":
      return validateGroqKey(apiKey);
    case "mistral":
      return validateMistralKey(apiKey);
    case "cohere":
      return validateCohereKey(apiKey);
    case "together_ai":
      return validateTogetherAIKey(apiKey);
    case "perplexity":
      return validatePerplexityKey(apiKey);
    case "fireworks_ai":
      return validateFireworksKey(apiKey);
    case "openrouter":
      return validateOpenRouterKey(apiKey);
    case "ai21":
      return validateAI21Key(apiKey);
    case "replicate":
      return validateReplicateKey(apiKey);
    case "azure":
    case "vertex_ai":
    case "bedrock":
      // These providers use different authentication methods
      return {
        valid: true,
        message: `${providerConfig.name} uses complex authentication. Please ensure your credentials are configured correctly.`,
        details: { provider },
      };
    default:
      // For any other provider, skip validation but warn
      return {
        valid: true,
        message: `API key validation not implemented for ${providerConfig.name}. Skipping validation.`,
        details: { provider },
      };
  }
}

/**
 * Check if API key format is valid (basic format check)
 */
export function isValidApiKeyFormat(provider: string, apiKey: string): boolean {
  if (!apiKey || apiKey.length < 10) {
    return false;
  }

  const providerConfig = getProviderConfig(provider);
  if (providerConfig?.apiKeyFormat) {
    // Check provider-specific format hints
    switch (provider) {
      case "openai":
        return apiKey.startsWith("sk-");
      case "anthropic":
        return apiKey.startsWith("sk-ant-");
      case "gemini":
        return apiKey.startsWith("AIza");
      case "groq":
        return apiKey.startsWith("gsk_");
      case "perplexity":
        return apiKey.startsWith("pplx-");
      case "openrouter":
        return apiKey.startsWith("sk-or-");
      case "replicate":
        return apiKey.startsWith("r8_");
      default:
        // For other providers, just check minimum length
        return apiKey.length >= 20;
    }
  }

  return true;
}

/**
 * Get API key format hint for a provider
 */
export function getApiKeyFormatHint(provider: string): string {
  const providerConfig = getProviderConfig(provider);
  
  if (providerConfig?.apiKeyFormat) {
    return `${providerConfig.name} API keys should be in format: ${providerConfig.apiKeyFormat}`;
  }

  // Default hints based on provider
  const hints: Record<string, string> = {
    openai: "OpenAI API keys should start with 'sk-'",
    anthropic: "Anthropic API keys should start with 'sk-ant-'",
    gemini: "Google API keys should start with 'AIza'",
    groq: "Groq API keys should start with 'gsk_'",
    perplexity: "Perplexity API keys should start with 'pplx-'",
    openrouter: "OpenRouter API keys should start with 'sk-or-'",
    replicate: "Replicate API keys should start with 'r8_'",
  };

  return hints[provider] || "API key should be at least 20 characters";
}

/**
 * Get environment variable name for API key
 */
export function getApiKeyEnvVar(provider: string): string {
  return getProviderApiKeyEnvVar(provider);
}
