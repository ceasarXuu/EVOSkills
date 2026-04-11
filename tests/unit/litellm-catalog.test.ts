import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLiteLLMCatalog } from '../../src/config/litellm-catalog.js';

describe('LiteLLM catalog loader', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('falls back to bundled providers when remote registry fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')));

    const catalog = await getLiteLLMCatalog(true);
    const deepseek = catalog.find((entry) => entry.id === 'deepseek');
    const openai = catalog.find((entry) => entry.id === 'openai');

    expect(catalog.length).toBeGreaterThan(0);
    expect(deepseek?.defaultModel).toBe('deepseek/deepseek-reasoner');
    expect(deepseek?.models).toContain('deepseek/deepseek-chat');
    expect(openai?.models).toContain('openai/gpt-4o');
  });
});
