/**
 * Interactive Skill Selector
 * Provides interactive selection UI for skills
 */

import { logger } from './logger.js';
import { cliInfo } from './cli-output.js';

export interface SkillInfo {
  skillId: string;
  status: string;
  revision?: number;
  lastOptimized?: string;
}

/**
 * Import inquirer with ESM compatibility
 */
async function getInquirer(): Promise<typeof import('inquirer').default> {
  const mod = await import('inquirer');
  return mod.default || mod;
}

/**
 * Interactive skill selector using inquirer
 */
export async function selectSkillInteractively(
  skills: SkillInfo[],
  message: string = 'Select a skill:'
): Promise<string | null> {
  if (skills.length === 0) {
    logger.warn('No skills available to select');
    return null;
  }

  const inquirer = await getInquirer();

  const choices = skills.map((skill) => ({
    name: `${skill.skillId.padEnd(20)} [${skill.status}] ${skill.lastOptimized ? `(last: ${skill.lastOptimized})` : ''}`,
    value: skill.skillId,
    short: skill.skillId,
  }));

  // Add cancel option
  choices.push({
    name: '──────────────',
    value: '__SEPARATOR__',
    short: '',
  });
  choices.push({
    name: '❌ Cancel',
    value: '__CANCEL__',
    short: 'Cancel',
  });

  // Use 'select' type for inquirer v13+ compatibility
  const answers = await inquirer.prompt({
    type: 'select',
    name: 'selectedSkill',
    message,
    choices,
    pageSize: 15,
  });

  const selectedSkill = answers.selectedSkill as string;

  if (selectedSkill === '__CANCEL__' || selectedSkill === '__SEPARATOR__') {
    return null;
  }

  return selectedSkill;
}

/**
 * Interactive multi-select for skills
 */
export async function selectMultipleSkillsInteractively(
  skills: SkillInfo[],
  message: string = 'Select skills (use space to select, enter to confirm):'
): Promise<string[]> {
  if (skills.length === 0) {
    logger.warn('No skills available to select');
    return [];
  }

  const inquirer = await getInquirer();

  const choices = skills.map((skill) => ({
    name: `${skill.skillId.padEnd(20)} [${skill.status}]`,
    value: skill.skillId,
    checked: false,
  }));

  const answers = await inquirer.prompt({
    type: 'checkbox',
    name: 'selectedSkills',
    message,
    choices,
    pageSize: 15,
    validate: (input: string[]) => {
      if (input.length === 0) {
        return 'Please select at least one skill';
      }
      return true;
    },
  });

  return answers.selectedSkills as string[];
}

/**
 * Confirm action with preview
 */
export async function confirmWithPreview(
  action: string,
  targets: string[],
  preview?: string
): Promise<boolean> {
  const inquirer = await getInquirer();

  cliInfo('\n' + '='.repeat(60));
  cliInfo(`📋 Action Preview: ${action}`);
  cliInfo('='.repeat(60));

  if (preview) {
    cliInfo(preview);
  } else {
    cliInfo(`\nThis will ${action.toLowerCase()} the following ${targets.length} item(s):`);
    targets.forEach((target, index) => {
      cliInfo(`  ${index + 1}. ${target}`);
    });
  }

  cliInfo('\n' + '-'.repeat(60));

  const answers = await inquirer.prompt({
    type: 'confirm',
    name: 'confirmed',
    message: `Are you sure you want to proceed?`,
    default: false,
  });

  return answers.confirmed as boolean;
}

/**
 * Show dry-run preview for batch operations
 */
export function showDryRunPreview(
  operation: string,
  targets: Array<{
    id: string;
    currentState?: string;
    newState?: string;
    details?: string;
  }>
): void {
  cliInfo('\n' + '╔' + '═'.repeat(58) + '╗');
  cliInfo('║' + ' 🔍 DRY RUN PREVIEW'.padEnd(58) + '║');
  cliInfo('╠' + '═'.repeat(58) + '╣');
  cliInfo('║' + ` Operation: ${operation}`.padEnd(58) + '║');
  cliInfo('║' + ` Targets: ${targets.length} item(s)`.padEnd(58) + '║');
  cliInfo('╠' + '═'.repeat(58) + '╣');

  targets.forEach((target, index) => {
    const line = ` ${index + 1}. ${target.id}`;
    cliInfo('║' + line.padEnd(58) + '║');

    if (target.currentState && target.newState) {
      const stateLine = `    ${target.currentState} → ${target.newState}`;
      cliInfo('║' + stateLine.padEnd(58) + '║');
    }

    if (target.details) {
      const detailLines = target.details.match(/.{1,54}/g) || [target.details];
      detailLines.forEach((line) => {
        cliInfo('║' + `    ${line}`.padEnd(58) + '║');
      });
    }
  });

  cliInfo('╠' + '═'.repeat(58) + '╣');
  cliInfo('║' + ' ⚠️  This is a preview. No changes have been made.'.padEnd(58) + '║');
  cliInfo('╚' + '═'.repeat(58) + '╝');
  cliInfo('');
}

/**
 * Select from a list of options interactively
 */
export async function selectFromOptions<T>(
  options: Array<{ name: string; value: T; description?: string }>,
  message: string
): Promise<T | undefined> {
  const inquirer = await getInquirer();

  const choices: Array<{ name: string; value: T | string; short?: string }> = options.map(
    (opt) => ({
      name: opt.description ? `${opt.name} - ${opt.description}` : opt.name,
      value: opt.value,
      short: opt.name,
    })
  );

  // Add cancel option
  choices.push({
    name: '──────────────',
    value: '__SEPARATOR__',
    short: '',
  });
  choices.push({
    name: '❌ Cancel',
    value: '__CANCEL__',
    short: 'Cancel',
  });

  const answers = await inquirer.prompt({
    type: 'select',
    name: 'selected',
    message,
    choices,
  });

  const selected = answers.selected as T | string;

  if (selected === '__CANCEL__' || selected === '__SEPARATOR__') {
    return undefined;
  }

  return selected as T;
}
