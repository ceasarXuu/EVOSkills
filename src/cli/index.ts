#!/usr/bin/env node

import { Command } from 'commander';
import { createStatusCommand } from './commands/status.js';
import { createRollbackCommand } from './commands/rollback.js';

const program = new Command();

program
  .name('sea')
  .description('SEA Skills - Skill Evolution Agent')
  .version('0.1.0');

// Skills 子命令
const skills = new Command('skills')
  .description('Manage shadow skills');

skills.addCommand(createStatusCommand());
skills.addCommand(createRollbackCommand());

program.addCommand(skills);

// 解析命令行参数
program.parse();