/**
 * Shell Completion Command
 * Generates shell completion scripts for bash, zsh, and fish
 */

import { Command } from 'commander';
import { cliInfo } from '../../utils/cli-output.js';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { printErrorAndExit } from '../../utils/error-helper.js';

interface CompletionOptions {
  shell: string;
  output?: string;
}

/**
 * Generate Bash completion script
 */
function generateBashCompletion(): string {
  return [
    '# OrnnSkills Bash Completion',
    '# Source this file: source <(ornn completion bash)',
    '# Or install to: /etc/bash_completion.d/ornn',
    '',
    '_ornn_complete() {',
    '  local cur prev opts',
    '  COMPREPLY=()',
    '  cur="${COMP_WORDS[COMP_CWORD]}"',
    '  prev="${COMP_WORDS[COMP_CWORD-1]}"',
    '',
    '  # Main commands',
    '  local commands="init daemon skills logs version help"',
    '  ',
    '  # Skills subcommands',
    '  local skills_commands="status log diff rollback freeze unfreeze sync preview"',
    '  ',
    '  # Daemon subcommands',
    '  local daemon_commands="start stop status"',
    '  ',
    '  # Global options',
    '  local global_opts="--help --version"',
    '',
    '  # Complete based on context',
    '  case "${COMP_WORDS[1]}" in',
    '    skills)',
    '      case "${COMP_WORDS[2]}" in',
    '        status)',
    '          COMPREPLY=( $(compgen -W "--project --skill --help" -- $cur) )',
    '          return 0',
    '          ;;',
    '        log|history)',
    '          COMPREPLY=( $(compgen -W "--project --limit --type --since --until --search --applied-by --help" -- $cur) )',
    '          return 0',
    '          ;;',
    '        diff)',
    '          COMPREPLY=( $(compgen -W "--project --revision --origin --help" -- $cur) )',
    '          return 0',
    '          ;;',
    '        rollback|revert)',
    '          COMPREPLY=( $(compgen -W "--project --to --snapshot --initial --force --help" -- $cur) )',
    '          return 0',
    '          ;;',
    '        freeze)',
    '          COMPREPLY=( $(compgen -W "--project --all --force --dry-run --interactive --help" -- $cur) )',
    '          return 0',
    '          ;;',
    '        unfreeze)',
    '          COMPREPLY=( $(compgen -W "--project --all --force --dry-run --interactive --help" -- $cur) )',
    '          return 0',
    '          ;;',
    '        sync)',
    '          COMPREPLY=( $(compgen -W "--project --force --help" -- $cur) )',
    '          return 0',
    '          ;;',
    '        preview)',
    '          COMPREPLY=( $(compgen -W "--project --revision --help" -- $cur) )',
    '          return 0',
    '          ;;',
    '        *)',
    '          if [[ $cur == -* ]]; then',
    '            COMPREPLY=( $(compgen -W "--help" -- $cur) )',
    '          else',
    '            COMPREPLY=( $(compgen -W "$skills_commands" -- $cur) )',
    '          fi',
    '          return 0',
    '          ;;',
    '      esac',
    '      ;;',
    '    daemon)',
    '      case "${COMP_WORDS[2]}" in',
    '        start|stop|status)',
    '          COMPREPLY=( $(compgen -W "--project --help" -- $cur) )',
    '          return 0',
    '          ;;',
    '        *)',
    '          if [[ $cur == -* ]]; then',
    '            COMPREPLY=( $(compgen -W "--help" -- $cur) )',
    '          else',
    '            COMPREPLY=( $(compgen -W "$daemon_commands" -- $cur) )',
    '          fi',
    '          return 0',
    '          ;;',
    '      esac',
    '      ;;',
    '    logs)',
    '      COMPREPLY=( $(compgen -W "--project --tail --level --skill --follow --help" -- $cur) )',
    '      return 0',
    '      ;;',
    '    init)',
    '      COMPREPLY=( $(compgen -W "--force --help" -- $cur) )',
    '      return 0',
    '      ;;',
    '    *)',
    '      if [[ $cur == -* ]]; then',
    '        COMPREPLY=( $(compgen -W "$global_opts" -- $cur) )',
    '      else',
    '        COMPREPLY=( $(compgen -W "$commands" -- $cur) )',
    '      fi',
    '      return 0',
    '      ;;',
    '  esac',
    '}',
    '',
    'complete -F _ornn_complete ornn',
    '',
  ].join('\n');
}

/**
 * Generate Zsh completion script
 */
function generateZshCompletion(): string {
  return [
    '#compdef ornn',
    '',
    '# OrnnSkills Zsh Completion',
    '# Install to: /usr/share/zsh/site-functions/_ornn',
    '# Or add to fpath: fpath+=(~/.zsh/completions)',
    '',
    '_ornn() {',
    '  local curcontext="$curcontext" state line',
    '  typeset -A opt_args',
    '',
    '  _arguments -C \\',
    "    '(-h --help)'{-h,--help}'[Show help]' \\",
    "    '(-v --version)'{-v,--version}'[Show version]' \\",
    "    '1: :_ornn_commands' \\",
    "    '*:: :->args'",
    '',
    '  case "$line[1]" in',
    '    skills)',
    '      _ornn_skills',
    '      ;;',
    '    daemon)',
    '      _ornn_daemon',
    '      ;;',
    '    logs)',
    '      _arguments \\',
    "        '(-p --project)'{-p,--project}'[Project root path]:path:_directories' \\",
    "        '(-n --tail)'{-n,--tail}'[Number of lines]:number:' \\",
    "        '(-l --level)'{-l,--level}'[Filter by level]:level:(error warn info debug)' \\",
    "        '(-s --skill)'{-s,--skill}'[Filter by skill]:skill:_ornn_skill_ids' \\",
    "        '(-f --follow)'{-f,--follow}'[Follow log output]'",
    '      ;;',
    '    init)',
    '      _arguments \\',
    "        '--force[Force reinitialization]'",
    '      ;;',
    '  esac',
    '}',
    '',
    '_ornn_commands() {',
    '  local commands=(',
    "    'init:Initialize Ornn Skills in current project'",
    "    'daemon:Manage the OrnnSkills background daemon'",
    "    'skills:Manage shadow skills'",
    "    'logs:View OrnnSkills logs'",
    "    'completion:Generate shell completion scripts'",
    '  )',
    "  _describe -t commands 'ornn commands' commands",
    '}',
    '',
    '_ornn_skills() {',
    '  local curcontext="$curcontext"',
    '  ',
    '  if (( CURRENT == 1 )); then',
    '    local subcommands=(',
    "      'status:Show status of shadow skills'",
    "      'log:Show evolution log for a shadow skill'",
    "      'diff:Show diff between shadow skill and origin'",
    "      'rollback:Rollback a shadow skill to a previous version'",
    "      'freeze:Pause automatic optimization for a shadow skill'",
    "      'unfreeze:Resume automatic optimization for a shadow skill'",
    "      'sync:Sync shadow skill back to origin'",
    "      'preview:Preview changes that would be applied'",
    '    )',
    "    _describe -t commands 'skills subcommands' subcommands",
    '  else',
    '    shift words',
    '    (( CURRENT-- ))',
    '    ',
    '    case "$line[1]" in',
    '      status)',
    '        _arguments \\',
    "          '(-p --project)'{-p,--project}'[Project root path]:path:_directories' \\",
    "          '(-s --skill)'{-s,--skill}'[Show detailed status for specific skill]:skill:_ornn_skill_ids' \\",
    "          '(-i --interactive)'{-i,--interactive}'[Select skill interactively]'",
    '        ;;',
    '      log|history)',
    '        _arguments \\',
    "          '(-p --project)'{-p,--project}'[Project root path]:path:_directories' \\",
    "          '(-n --limit)'{-n,--limit}'[Number of records]:number:' \\",
    "          '(-t --type)'{-t,--type}'[Filter by change type]:type:(append_context tighten_trigger add_fallback prune_noise rewrite_section)' \\",
    "          '--since[Show records since date]:date:' \\",
    "          '--until[Show records until date]:date:' \\",
    "          '--search[Search in reason field]:keyword:' \\",
    "          '--applied-by[Filter by source]:source:(auto manual)' \\",
    "          ':skill:_ornn_skill_ids'",
    '        ;;',
    '      diff)',
    '        _arguments \\',
    "          '(-p --project)'{-p,--project}'[Project root path]:path:_directories' \\",
    "          '(-r --revision)'{-r,--revision}'[Compare with specific revision]:revision:' \\",
    "          '(-o --origin)'{-o,--origin}'[Compare with origin skill]' \\",
    "          ':skill:_ornn_skill_ids'",
    '        ;;',
    '      rollback|revert)',
    '        _arguments \\',
    "          '(-p --project)'{-p,--project}'[Project root path]:path:_directories' \\",
    "          '(-t --to)'{-t,--to}'[Rollback to specific revision]:revision:' \\",
    "          '(-s --snapshot)'{-s,--snapshot}'[Rollback to latest snapshot]' \\",
    "          '(-i --initial)'{-i,--initial}'[Rollback to initial version]' \\",
    "          '(-f --force)'{-f,--force}'[Skip confirmation prompt]' \\",
    "          ':skill:_ornn_skill_ids'",
    '        ;;',
    '      freeze)',
    '        _arguments \\',
    "          '(-p --project)'{-p,--project}'[Project root path]:path:_directories' \\",
    "          '--all[Freeze all skills]' \\",
    "          '(-f --force)'{-f,--force}'[Skip confirmation prompt]' \\",
    "          '--dry-run[Show what would be frozen without making changes]' \\",
    "          '(-i --interactive)'{-i,--interactive}'[Select skills interactively]' \\",
    "          ':skill:_ornn_skill_ids'",
    '        ;;',
    '      unfreeze)',
    '        _arguments \\',
    "          '(-p --project)'{-p,--project}'[Project root path]:path:_directories' \\",
    "          '--all[Unfreeze all skills]' \\",
    "          '(-f --force)'{-f,--force}'[Skip confirmation prompt]' \\",
    "          '--dry-run[Show what would be unfrozen without making changes]' \\",
    "          '(-i --interactive)'{-i,--interactive}'[Select skills interactively]' \\",
    "          ':skill:_ornn_skill_ids'",
    '        ;;',
    '      sync)',
    '        _arguments \\',
    "          '(-p --project)'{-p,--project}'[Project root path]:path:_directories' \\",
    "          '(-f --force)'{-f,--force}'[Force sync without confirmation]' \\",
    "          ':skill:_ornn_skill_ids'",
    '        ;;',
    '      preview)',
    '        _arguments \\',
    "          '(-p --project)'{-p,--project}'[Project root path]:path:_directories' \\",
    "          '(-r --revision)'{-r,--revision}'[Preview changes from specific revision]:revision:' \\",
    "          ':skill:_ornn_skill_ids'",
    '        ;;',
    '    esac',
    '  fi',
    '}',
    '',
    '_ornn_daemon() {',
    '  if (( CURRENT == 1 )); then',
    '    local subcommands=(',
    "      'start:Start the OrnnSkills daemon'",
    "      'stop:Stop the OrnnSkills daemon'",
    "      'status:Check daemon status'",
    '    )',
    "    _describe -t commands 'daemon subcommands' subcommands",
    '  else',
    '    _arguments \\',
    "      '(-p --project)'{-p,--project}'[Project root path]:path:_directories'",
    '  fi',
    '}',
    '',
    '_ornn_skill_ids() {',
    '  # Try to get skill IDs from the current project',
    '  local skills=()',
    '  if [[ -d .ornn/skills ]]; then',
    '    for dir in .ornn/skills/*(/); do',
    '      if [[ -d "$dir" ]]; then',
    '        skills+=("$(basename "$dir")")',
    '      fi',
    '    done',
    '  fi',
    '  ',
    '  if (( ${#skills} > 0 )); then',
    "    _describe -t skills 'skill IDs' skills",
    '  else',
    "    _message 'skill ID'",
    '  fi',
    '}',
    '',
    '_ornn "$@"',
    '',
  ].join('\n');
}

/**
 * Generate Fish completion script
 */
function generateFishCompletion(): string {
  return [
    '# OrnnSkills Fish Completion',
    '# Install to: ~/.config/fish/completions/ornn.fish',
    '',
    '# Main commands',
    'complete -c ornn -f',
    "complete -c ornn -n '__fish_use_subcommand' -a 'init' -d 'Initialize Ornn Skills in current project'",
    "complete -c ornn -n '__fish_use_subcommand' -a 'daemon' -d 'Manage the OrnnSkills background daemon'",
    "complete -c ornn -n '__fish_use_subcommand' -a 'skills' -d 'Manage shadow skills'",
    "complete -c ornn -n '__fish_use_subcommand' -a 'logs' -d 'View OrnnSkills logs'",
    "complete -c ornn -n '__fish_use_subcommand' -a 'completion' -d 'Generate shell completion scripts'",
    '',
    '# Global options',
    "complete -c ornn -s h -l help -d 'Show help'",
    "complete -c ornn -s v -l version -d 'Show version'",
    '',
    '# Init options',
    "complete -c ornn -n '__fish_seen_subcommand_from init' -l force -d 'Force reinitialization'",
    '',
    '# Daemon subcommands',
    "complete -c ornn -n '__fish_seen_subcommand_from daemon' -a 'start' -d 'Start the daemon'",
    "complete -c ornn -n '__fish_seen_subcommand_from daemon' -a 'stop' -d 'Stop the daemon'",
    "complete -c ornn -n '__fish_seen_subcommand_from daemon' -a 'status' -d 'Check daemon status'",
    '',
    '# Daemon options',
    "complete -c ornn -n '__fish_seen_subcommand_from daemon' -s p -l project -d 'Project root path' -a '(__fish_complete_directories)'",
    '',
    '# Skills subcommands',
    "complete -c ornn -n '__fish_seen_subcommand_from skills' -a 'status' -d 'Show status of shadow skills'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills' -a 'log' -d 'Show evolution log'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills' -a 'diff' -d 'Show diff with origin'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills' -a 'rollback' -d 'Rollback to previous version'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills' -a 'freeze' -d 'Pause automatic optimization'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills' -a 'unfreeze' -d 'Resume automatic optimization'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills' -a 'sync' -d 'Sync to origin'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills' -a 'preview' -d 'Preview changes'",
    '',
    '# Skills status options',
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from status' -s p -l project -d 'Project root path' -a '(__fish_complete_directories)'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from status' -s s -l skill -d 'Show detailed status for specific skill'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from status' -s i -l interactive -d 'Select skill interactively'",
    '',
    '# Skills log options',
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from log' -s p -l project -d 'Project root path' -a '(__fish_complete_directories)'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from log' -s n -l limit -d 'Number of records'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from log' -s t -l type -d 'Filter by change type' -a 'append_context tighten_trigger add_fallback prune_noise rewrite_section'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from log' -l since -d 'Show records since date'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from log' -l until -d 'Show records until date'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from log' -l search -d 'Search in reason field'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from log' -l applied-by -d 'Filter by source' -a 'auto manual'",
    '',
    '# Skills diff options',
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from diff' -s p -l project -d 'Project root path' -a '(__fish_complete_directories)'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from diff' -s r -l revision -d 'Compare with specific revision'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from diff' -s o -l origin -d 'Compare with origin skill'",
    '',
    '# Skills rollback options',
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from rollback' -s p -l project -d 'Project root path' -a '(__fish_complete_directories)'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from rollback' -s t -l to -d 'Rollback to specific revision'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from rollback' -s s -l snapshot -d 'Rollback to latest snapshot'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from rollback' -s i -l initial -d 'Rollback to initial version'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from rollback' -s f -l force -d 'Skip confirmation prompt'",
    '',
    '# Skills freeze/unfreeze options',
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from freeze' -s p -l project -d 'Project root path' -a '(__fish_complete_directories)'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from freeze' -l all -d 'Freeze all skills'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from freeze' -s f -l force -d 'Skip confirmation prompt'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from freeze' -l dry-run -d 'Show what would be frozen without making changes'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from freeze' -s i -l interactive -d 'Select skills interactively'",
    '',
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from unfreeze' -s p -l project -d 'Project root path' -a '(__fish_complete_directories)'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from unfreeze' -l all -d 'Unfreeze all skills'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from unfreeze' -s f -l force -d 'Skip confirmation prompt'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from unfreeze' -l dry-run -d 'Show what would be unfrozen without making changes'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from unfreeze' -s i -l interactive -d 'Select skills interactively'",
    '',
    '# Skills sync options',
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from sync' -s p -l project -d 'Project root path' -a '(__fish_complete_directories)'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from sync' -s f -l force -d 'Force sync without confirmation'",
    '',
    '# Skills preview options',
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from preview' -s p -l project -d 'Project root path' -a '(__fish_complete_directories)'",
    "complete -c ornn -n '__fish_seen_subcommand_from skills; and __fish_seen_subcommand_from preview' -s r -l revision -d 'Preview changes from specific revision'",
    '',
    '# Logs options',
    "complete -c ornn -n '__fish_seen_subcommand_from logs' -s p -l project -d 'Project root path' -a '(__fish_complete_directories)'",
    "complete -c ornn -n '__fish_seen_subcommand_from logs' -s n -l tail -d 'Number of lines to show'",
    "complete -c ornn -n '__fish_seen_subcommand_from logs' -s l -l level -d 'Filter by level' -a 'error warn info debug'",
    "complete -c ornn -n '__fish_seen_subcommand_from logs' -s s -l skill -d 'Filter logs for specific skill'",
    "complete -c ornn -n '__fish_seen_subcommand_from logs' -s f -l follow -d 'Follow log output'",
    '',
    '# Completion options',
    "complete -c ornn -n '__fish_seen_subcommand_from completion' -a 'bash' -d 'Generate bash completion'",
    "complete -c ornn -n '__fish_seen_subcommand_from completion' -a 'zsh' -d 'Generate zsh completion'",
    "complete -c ornn -n '__fish_seen_subcommand_from completion' -a 'fish' -d 'Generate fish completion'",
    "complete -c ornn -n '__fish_seen_subcommand_from completion' -s o -l output -d 'Output file path'",
    '',
  ].join('\n');
}

/**
 * Get installation instructions for the shell
 */
function getInstallInstructions(shell: string): string {
  const instructions: Record<string, string> = {
    bash: [
      '# Bash Completion Installation',
      '',
      '## Option 1: Source directly (temporary)',
      'source <(ornn completion bash)',
      '',
      '## Option 2: Install system-wide (recommended)',
      '# Linux:',
      'sudo ornn completion bash > /etc/bash_completion.d/ornn',
      '',
      '# macOS with Homebrew:',
      'ornn completion bash > $(brew --prefix)/etc/bash_completion.d/ornn',
      '',
      '## Option 3: User-local installation',
      'mkdir -p ~/.bash_completion.d',
      'ornn completion bash > ~/.bash_completion.d/ornn',
      "echo 'source ~/.bash_completion.d/ornn' >> ~/.bashrc",
    ].join('\n'),
    zsh: [
      '# Zsh Completion Installation',
      '',
      '## Option 1: Add to fpath (recommended)',
      'mkdir -p ~/.zsh/completions',
      'ornn completion zsh > ~/.zsh/completions/_ornn',
      '',
      '# Add to ~/.zshrc if not already present:',
      '# fpath+=(~/.zsh/completions)',
      '',
      '## Option 2: Use with oh-my-zsh',
      'mkdir -p ~/.oh-my-zsh/completions',
      'ornn completion zsh > ~/.oh-my-zsh/completions/_ornn',
      '',
      '## Option 3: Source directly (temporary)',
      'source <(ornn completion zsh)',
    ].join('\n'),
    fish: [
      '# Fish Completion Installation',
      '',
      '## Automatic installation (recommended)',
      'mkdir -p ~/.config/fish/completions',
      'ornn completion fish > ~/.config/fish/completions/ornn.fish',
      '',
      '# Fish will automatically load the completions',
    ].join('\n'),
  };

  return instructions[shell] || '';
}

/**
 * Create the completion command
 */
export function createCompletionCommand(): Command {
  const completion = new Command('completion');

  completion
    .description('Generate shell completion scripts')
    .argument('<shell>', 'Shell type (bash, zsh, fish)')
    .option('-o, --output <file>', 'Output file path (default: stdout)')
    .addHelpText(
      'after',
      [
        'Examples:',
        '  $ ornn completion bash                    # Output to stdout',
        '  $ ornn completion bash > /etc/bash_completion.d/ornn',
        '  $ ornn completion zsh -o ~/.zsh/completions/_ornn',
        '  $ ornn completion fish --output ~/.config/fish/completions/ornn.fish',
        '',
        'Installation:',
        '  Bash:  source <(ornn completion bash)',
        '  Zsh:   source <(ornn completion zsh)',
        '  Fish:  ornn completion fish > ~/.config/fish/completions/ornn.fish',
      ].join('\n')
    )
    .action((shell: string, options: CompletionOptions) => {
      const validShells = ['bash', 'zsh', 'fish'];

      if (!validShells.includes(shell)) {
        printErrorAndExit(
          `Invalid shell "${shell}". Valid options: ${validShells.join(', ')}`,
          { operation: 'Generate completion script' }
        );
      }

      let script: string;
      switch (shell) {
        case 'bash':
          script = generateBashCompletion();
          break;
        case 'zsh':
          script = generateZshCompletion();
          break;
        case 'fish':
          script = generateFishCompletion();
          break;
        default:
          script = '';
      }

      if (options.output) {
        try {
          // Ensure directory exists
          const dir = dirname(options.output);
          if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
          }
          writeFileSync(options.output, script, 'utf-8');
          cliInfo(`Completion script written to: ${options.output}`);

          // Show installation instructions
          const instructions = getInstallInstructions(shell);
          if (instructions) {
            cliInfo('\n' + instructions);
          }
        } catch (error) {
          printErrorAndExit(
            `Failed to write completion script to "${options.output}": ${
              error instanceof Error ? error.message : String(error)
            }`,
            { operation: 'Write completion script' },
            'PERMISSION_DENIED'
          );
        }
      } else {
        // Output to stdout
        cliInfo(script);
      }
    });

  return completion;
}
