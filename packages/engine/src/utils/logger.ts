// FILE: packages/engine/src/utils/logger.ts

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'debug',
  base: { service: 'wazakkir-engine' },
  timestamp: pino.stdTimeFunctions.isoTime,
});
