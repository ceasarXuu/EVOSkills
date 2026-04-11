import { existsSync, mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Language } from './i18n.js';

const LANGUAGE_STATE_FILE = 'dashboard-language.json';

function normalizeLanguage(lang?: string | null): Language {
  return lang === 'zh' ? 'zh' : 'en';
}

function getLanguageStatePath(projectPath: string): string {
  return join(projectPath, '.ornn', 'state', LANGUAGE_STATE_FILE);
}

export async function readProjectLanguage(projectPath: string, fallback: Language = 'en'): Promise<Language> {
  const languagePath = getLanguageStatePath(projectPath);
  if (!existsSync(languagePath)) return fallback;
  try {
    const content = await readFile(languagePath, 'utf-8');
    const parsed = JSON.parse(content) as { lang?: string };
    return normalizeLanguage(parsed.lang ?? fallback);
  } catch {
    return fallback;
  }
}

export async function writeProjectLanguage(projectPath: string, lang: Language): Promise<void> {
  const stateDir = join(projectPath, '.ornn', 'state');
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }
  await writeFile(
    getLanguageStatePath(projectPath),
    JSON.stringify({ lang: normalizeLanguage(lang) }, null, 2),
    'utf-8'
  );
}
