import { logger } from './logger.js';

/* eslint-disable no-console */
export function cliInfo(msg: string): void {
  logger.info(msg);
  console.log(msg);
}

export function cliWarn(msg: string): void {
  logger.warn(msg);
  console.warn(msg);
}

export function cliError(msg: string): void {
  logger.error(msg);
  console.error(msg);
}
