import type { Language } from '../../dashboard/i18n.js';

const CJK_CHAR_RE = /[\u3400-\u9fff]/u;
const LATIN_CHAR_RE = /[A-Za-z]/;
const LATIN_WORD_RE = /[A-Za-z]{2,}/g;

function countLatinWords(text: string): number {
  return text.match(LATIN_WORD_RE)?.length ?? 0;
}

export function needsNarrativeFallback(text: string, lang: Language): boolean {
  const normalized = String(text ?? '').trim();
  if (!normalized) return true;
  if (lang !== 'zh') return false;
  if (!LATIN_CHAR_RE.test(normalized)) return false;
  if (!CJK_CHAR_RE.test(normalized)) return true;
  return countLatinWords(normalized) >= 5;
}

export function normalizeNarrativeString(value: unknown, fallback: string, lang: Language): string {
  const candidate = typeof value === 'string' && value.trim() ? value.trim() : fallback;
  return needsNarrativeFallback(candidate, lang) ? fallback : candidate;
}

export function normalizeNarrativeArray(value: unknown, fallback: string[], lang: Language): string[] {
  const candidate = Array.isArray(value)
    ? value.map((item) => String(item ?? '').trim()).filter(Boolean)
    : fallback;
  if (candidate.length === 0) return fallback;
  if (lang !== 'zh') return candidate;
  const localized = candidate.filter((item) => !needsNarrativeFallback(item, lang));
  return localized.length > 0 ? localized : fallback;
}
