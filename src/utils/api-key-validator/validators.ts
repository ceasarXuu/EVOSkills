import type { ValidationResult } from './types.js';
import type { ProviderValidationPlan } from './provider-rules.js';

function successResult(
  provider: string,
  message: string,
  model?: string,
): ValidationResult {
  return {
    valid: true,
    message,
    details: {
      provider,
      model,
    },
  };
}

function failureResult(
  provider: string,
  message: string,
  error?: string,
): ValidationResult {
  return {
    valid: false,
    message,
    details: {
      provider,
      error,
    },
  };
}

function buildHeaders(plan: ProviderValidationPlan, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(plan.headers ?? {}),
  };

  if (plan.authHeader && plan.authScheme === 'Bearer') {
    headers[plan.authHeader] = `Bearer ${apiKey}`;
  } else if (plan.authHeader && plan.authScheme === 'Token') {
    headers[plan.authHeader] = `Token ${apiKey}`;
  } else if (plan.authHeader && plan.authScheme === 'raw') {
    headers[plan.authHeader] = apiKey;
  }

  return headers;
}

function describeFailure(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function validateChatCompletions(
  plan: ProviderValidationPlan,
  apiKey: string,
): Promise<ValidationResult> {
  try {
    const response = await fetch(plan.endpoint!, {
      method: 'POST',
      headers: buildHeaders(plan, apiKey),
      body: JSON.stringify({
        model: plan.model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    });

    if (response.status === 401) {
      return failureResult(
        plan.provider,
        `Invalid API key for ${plan.providerName}. Please check your key.`,
        'Unauthorized'
      );
    }

    if (response.status === 404) {
      return successResult(
        plan.provider,
        `${plan.providerName} API key appears valid (model not found, but authentication succeeded)`,
        plan.model
      );
    }

    if (!response.ok) {
      return failureResult(
        plan.provider,
        `${plan.providerName} API error: ${response.statusText}`,
        await response.text()
      );
    }

    return successResult(plan.provider, `${plan.providerName} API key is valid`, plan.model);
  } catch (error) {
    return failureResult(
      plan.provider,
      `Failed to validate ${plan.providerName} API key: ${describeFailure(error)}`,
      describeFailure(error)
    );
  }
}

async function validateAnthropic(
  plan: ProviderValidationPlan,
  apiKey: string,
): Promise<ValidationResult> {
  try {
    const response = await fetch(plan.endpoint!, {
      method: 'POST',
      headers: buildHeaders(plan, apiKey),
      body: JSON.stringify({
        model: plan.model,
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });

    if (response.status === 401) {
      return failureResult(plan.provider, 'Invalid Anthropic API key. Please check your key.', 'Unauthorized');
    }

    if (!response.ok) {
      return failureResult(plan.provider, `Anthropic API error: ${response.statusText}`, response.statusText);
    }

    return successResult(plan.provider, 'Anthropic API key is valid');
  } catch (error) {
    return failureResult(
      plan.provider,
      `Failed to validate Anthropic API key: ${describeFailure(error)}`,
      describeFailure(error)
    );
  }
}

async function validateGemini(
  plan: ProviderValidationPlan,
  apiKey: string,
): Promise<ValidationResult> {
  try {
    const response = await fetch(`${plan.endpoint!}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: buildHeaders(plan, apiKey),
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hi' }] }],
      }),
    });

    if (response.status === 400) {
      const data = await response.json() as { error?: { message?: string } };
      if (data.error?.message?.includes('API key')) {
        return failureResult(plan.provider, 'Invalid Google API key. Please check your key.', 'Invalid API key');
      }
    }

    if (!response.ok) {
      return failureResult(plan.provider, `Google API error: ${response.statusText}`, response.statusText);
    }

    return successResult(plan.provider, 'Google API key is valid');
  } catch (error) {
    return failureResult(
      plan.provider,
      `Failed to validate Google API key: ${describeFailure(error)}`,
      describeFailure(error)
    );
  }
}

async function validateAlibaba(
  plan: ProviderValidationPlan,
  apiKey: string,
): Promise<ValidationResult> {
  try {
    const response = await fetch(plan.endpoint!, {
      method: 'POST',
      headers: buildHeaders(plan, apiKey),
      body: JSON.stringify({
        model: plan.model,
        input: {
          messages: [{ role: 'user', content: 'Hi' }],
        },
      }),
    });

    if (response.status === 401 || response.status === 403) {
      return failureResult(plan.provider, 'Invalid Alibaba Cloud API key. Please check your key.', 'Unauthorized');
    }

    if (!response.ok) {
      return failureResult(plan.provider, `Alibaba Cloud API error: ${response.statusText}`, response.statusText);
    }

    return successResult(plan.provider, 'Alibaba Cloud API key is valid');
  } catch (error) {
    return failureResult(
      plan.provider,
      `Failed to validate Alibaba Cloud API key: ${describeFailure(error)}`,
      describeFailure(error)
    );
  }
}

async function validateCohere(
  plan: ProviderValidationPlan,
  apiKey: string,
): Promise<ValidationResult> {
  try {
    const response = await fetch(plan.endpoint!, {
      method: 'POST',
      headers: buildHeaders(plan, apiKey),
      body: JSON.stringify({
        model: plan.model,
        message: 'Hi',
      }),
    });

    if (response.status === 401) {
      return failureResult(plan.provider, 'Invalid Cohere API key. Please check your key.', 'Unauthorized');
    }

    if (!response.ok) {
      return failureResult(plan.provider, `Cohere API error: ${response.statusText}`, response.statusText);
    }

    return successResult(plan.provider, 'Cohere API key is valid');
  } catch (error) {
    return failureResult(
      plan.provider,
      `Failed to validate Cohere API key: ${describeFailure(error)}`,
      describeFailure(error)
    );
  }
}

async function validateReplicate(
  plan: ProviderValidationPlan,
  apiKey: string,
): Promise<ValidationResult> {
  try {
    const response = await fetch(plan.endpoint!, {
      method: 'GET',
      headers: buildHeaders(plan, apiKey),
    });

    if (response.status === 401) {
      return failureResult(plan.provider, 'Invalid Replicate API key. Please check your key.', 'Unauthorized');
    }

    if (!response.ok) {
      return failureResult(plan.provider, `Replicate API error: ${response.statusText}`, response.statusText);
    }

    return successResult(plan.provider, 'Replicate API key is valid');
  } catch (error) {
    return failureResult(
      plan.provider,
      `Failed to validate Replicate API key: ${describeFailure(error)}`,
      describeFailure(error)
    );
  }
}

export async function validateProviderApiKey(
  plan: ProviderValidationPlan,
  apiKey: string,
): Promise<ValidationResult> {
  switch (plan.mode) {
    case 'chat_completions':
      return validateChatCompletions(plan, apiKey);
    case 'anthropic_messages':
      return validateAnthropic(plan, apiKey);
    case 'gemini_generate_content':
      return validateGemini(plan, apiKey);
    case 'alibaba_generation':
      return validateAlibaba(plan, apiKey);
    case 'cohere_chat':
      return validateCohere(plan, apiKey);
    case 'replicate_models':
      return validateReplicate(plan, apiKey);
    case 'skip':
    default:
      return successResult(
        plan.provider,
        plan.skipMessage ?? `API key validation not implemented for ${plan.providerName}. Skipping validation.`
      );
  }
}
