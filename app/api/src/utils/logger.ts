/**
 * Structured Logging with Pino
 *
 * Provides JSON-formatted logs with correlation IDs
 * for observability and debugging
 */

import pino from 'pino';
import { config } from '../config.js';

const isPretty = config.logFormat === 'pretty' || config.nodeEnv === 'development';

export const logger = pino({
  level: config.logLevel,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: config.otelServiceName,
    version: config.version,
    env: config.nodeEnv,
  },
  ...(isPretty && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});

// Create child logger with request context
export const createRequestLogger = (requestId: string) => {
  return logger.child({ requestId });
};

export type Logger = typeof logger;
