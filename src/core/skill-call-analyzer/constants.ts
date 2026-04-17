import type { ChangeType } from '../../types/index.js';

export const SKILL_CALL_ANALYZER_PROMPT_VERSION = 'window-triage-v2';

export const ALLOWED_CHANGE_TYPES: ChangeType[] = [
  'append_context',
  'tighten_trigger',
  'add_fallback',
  'prune_noise',
  'rewrite_section',
];
