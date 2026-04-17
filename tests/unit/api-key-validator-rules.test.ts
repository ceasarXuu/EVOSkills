import { describe, expect, it } from 'vitest';

import {
  getProviderFormatRules,
  getProviderValidationPlan,
} from '../../src/utils/api-key-validator/provider-rules.js';

describe('api key validator provider rules', () => {
  it('returns a generic chat completion plan for openai', () => {
    const plan = getProviderValidationPlan('openai');

    expect(plan).toMatchObject({
      provider: 'openai',
      providerName: 'OpenAI',
      mode: 'chat_completions',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-3.5-turbo',
      authHeader: 'Authorization',
      authScheme: 'Bearer',
    });
  });

  it('returns a specialized anthropic messages plan', () => {
    const plan = getProviderValidationPlan('anthropic');

    expect(plan).toMatchObject({
      provider: 'anthropic',
      providerName: 'Anthropic',
      mode: 'anthropic_messages',
      endpoint: 'https://api.anthropic.com/v1/messages',
      model: 'claude-3-haiku',
      authHeader: 'x-api-key',
      authScheme: 'raw',
    });
    expect(plan?.headers).toMatchObject({
      'anthropic-version': '2023-06-01',
    });
  });

  it('marks bedrock validation as skipped', () => {
    const plan = getProviderValidationPlan('bedrock');

    expect(plan).toMatchObject({
      provider: 'bedrock',
      providerName: 'AWS Bedrock',
      mode: 'skip',
    });
    expect(plan?.skipMessage).toContain('complex authentication');
  });

  it('returns prefix and length format rules per provider', () => {
    expect(getProviderFormatRules('openrouter')).toMatchObject({
      prefixes: ['sk-or-'],
      minLength: 10,
    });
    expect(getProviderFormatRules('mistral')).toMatchObject({
      minLength: 20,
    });
  });
});