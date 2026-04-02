import { Command } from 'commander';
import { cliInfo } from '../../utils/cli-output.js';
import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { printErrorAndExit } from '../../utils/error-helper.js';

interface LogOptions {
  project: string;
  tail: string;
  level: string;
  skill?: string;
  follow?: boolean;
}

const PROJECT_LOG_DIR = '.ornn/logs';

function getLogFiles(projectRoot: string): string[] {
  const logs: string[] = [];

  const projectLogPath = join(projectRoot, PROJECT_LOG_DIR);
  const globalLogPath = join(process.env.HOME || '', '.ornn', 'logs');

  if (existsSync(projectLogPath)) {
    try {
      const files = readdirSync(projectLogPath);
      for (const file of files) {
        if (file.endsWith('.log')) {
          logs.push(join(projectLogPath, file));
        }
      }
    } catch {
      // Directory not accessible, skip
    }
  }

  if (existsSync(globalLogPath)) {
    try {
      const files = readdirSync(globalLogPath);
      for (const file of files) {
        if (file.endsWith('.log')) {
          const fullPath = join(globalLogPath, file);
          if (!logs.includes(fullPath)) {
            logs.push(fullPath);
          }
        }
      }
    } catch {
      // Directory not accessible, skip
    }
  }

  return logs;
}

function filterLogContent(content: string, options: LogOptions): string {
  const lines = content.split('\n');
  const filteredLines: string[] = [];
  const maxLines = parseInt(options.tail, 10) || 100;

  const levelMap: Record<string, string[]> = {
    error: ['ERROR', 'FATAL'],
    warn: ['WARN', 'WARNING'],
    info: ['INFO'],
    debug: ['DEBUG', 'TRACE'],
  };

  const targetLevels = options.level ? levelMap[options.level] || ['INFO'] : [];

  for (const line of lines) {
    if (!line.trim()) continue;

    if (options.level) {
      const hasLevel = targetLevels.some((l) => line.includes(l));
      if (!hasLevel) continue;
    }

    if (targetLevels.length === 0) {
      if (line.includes('ERROR') || line.includes('FATAL')) {
        filteredLines.push('🔴 ' + line);
      } else if (line.includes('WARN') || line.includes('WARNING')) {
        filteredLines.push('🟡 ' + line);
      } else if (line.includes('INFO')) {
        filteredLines.push('🔵 ' + line);
      } else if (line.includes('DEBUG') || line.includes('TRACE')) {
        filteredLines.push('⚪ ' + line);
      } else {
        filteredLines.push('  ' + line);
      }
    } else {
      if (options.level === 'error' && line.includes('ERROR')) {
        filteredLines.push('🔴 ' + line);
      } else if (options.level === 'warn' && (line.includes('WARN') || line.includes('WARNING'))) {
        filteredLines.push('🟡 ' + line);
      } else if (options.level === 'info' && line.includes('INFO')) {
        filteredLines.push('🔵 ' + line);
      } else if (options.level === 'debug' && (line.includes('DEBUG') || line.includes('TRACE'))) {
        filteredLines.push('⚪ ' + line);
      }
    }
  }

  return filteredLines.slice(-maxLines).join('\n');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

function formatDate(date: Date): string {
  return date.toLocaleString();
}

export function createLogsCommand(): Command {
  const logs = new Command('logs');

  logs
    .description('View OrnnSkills logs')
    .option('-p, --project <path>', 'Project root path', process.cwd())
    .option('-n, --tail <lines>', 'Number of lines to show', '100')
    .option('-l, --level <level>', 'Filter by level (error, warn, info, debug)', 'info')
    .option('-s, --skill <id>', 'Filter logs for specific skill')
    .option('-f, --follow', 'Follow log output (like tail -f)')
    .action((options: LogOptions) => {
      try {
        const projectRoot = options.project;

        const logFiles = getLogFiles(projectRoot);

        if (logFiles.length === 0) {
          cliInfo('\n📋 OrnnSkills Logs\n');
          cliInfo('   No log files found.\n');
          cliInfo('   Log files are stored at:');
          cliInfo('   • ~/.ornn/logs/ (global)');
          cliInfo('   • .ornn/logs/ (project)\n');
          cliInfo('   The daemon must be running to generate logs.');
          cliInfo('   Run "ornn daemon start" to start the daemon.\n');
          return;
        }

        const tailLines = parseInt(options.tail, 10) || 100;
        const filterLevel = options.level || 'info';

        cliInfo('\n📋 OrnnSkills Logs\n');
        cliInfo('   Project: ' + projectRoot);
        cliInfo('   Filter: ' + filterLevel.toUpperCase());
        cliInfo('   Lines: ' + tailLines);
        if (options.skill) {
          cliInfo('   Skill: ' + options.skill);
        }
        cliInfo('');

        for (const logFile of logFiles) {
          try {
            const stats = statSync(logFile);
            const basename = logFile.split('/').pop() || logFile;

            cliInfo('┌─────────────────────────────────────────────────────────────┐');
            cliInfo('│ 📄 ' + basename.padEnd(52) + ' │');
            cliInfo('│    Size: ' +
              formatFileSize(stats.size).padEnd(20) +
              ' Modified: ' +
              formatDate(stats.mtime) +
              ' │');
            cliInfo('└─────────────────────────────────────────────────────────────┘');
            cliInfo('');

            const content = readFileSync(logFile, 'utf-8');
            const filtered = filterLogContent(content, options);

            if (filtered) {
              cliInfo(filtered);
            } else {
              cliInfo('   (no matching log entries)');
            }
            cliInfo('');
          } catch (error) {
            cliInfo('   ⚠️  Could not read ' +
              logFile +
              ': ' +
              (error instanceof Error ? error.message : String(error)));
          }
        }

        cliInfo('   ─────────────────────────────────────────────────────────────');
        cliInfo('   💡 Tip: Use --level error to see only errors');
        cliInfo('   💡 Tip: Use --tail 50 to see fewer lines');
        cliInfo('   💡 Tip: Use --follow to watch logs in real-time\n');
      } catch (error) {
        printErrorAndExit(
          error instanceof Error ? error.message : String(error),
          { operation: 'View logs', projectPath: options.project },
          undefined
        );
      }
    });

  return logs;
}
