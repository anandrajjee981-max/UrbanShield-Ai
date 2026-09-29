import { isProduction, isTest } from '../config/env.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Centralised logger. The app never uses console.log directly so that log output
 * is always structured and never accidentally contains secrets (no password,
 * token or DATABASE_URL is passed to these helpers).
 */
const write = (level: LogLevel, message: string, context?: Record<string, unknown>): void => {
  if (isTest) return;
  if (isProduction && LOG_LEVEL_ORDER[level] < LOG_LEVEL_ORDER.info) return;

  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ? { context } : {}),
  });

  if (level === 'error' || level === 'warn') {
    process.stderr.write(`${entry}\n`);
    return;
  }

  process.stdout.write(`${entry}\n`);
};

export const logger = {
  debug: (message: string, context?: Record<string, unknown>): void => write('debug', message, context),
  info: (message: string, context?: Record<string, unknown>): void => write('info', message, context),
  warn: (message: string, context?: Record<string, unknown>): void => write('warn', message, context),
  error: (message: string, context?: Record<string, unknown>): void => write('error', message, context),
};
