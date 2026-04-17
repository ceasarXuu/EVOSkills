import type { Language } from '../dashboard/i18n.js';
import type { DashboardPromptSource } from '../config/prompt-overrides.js';

export function resolveConfiguredSystemPrompt(
  basePrompt: string,
  promptOverride: string,
  promptSource: DashboardPromptSource | undefined,
  _lang: Language
): string {
  const trimmedOverride = String(promptOverride || '').trim();
  if (promptSource !== 'custom' || !trimmedOverride) {
    return basePrompt;
  }
  return trimmedOverride;
}
