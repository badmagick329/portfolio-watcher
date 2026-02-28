import type {
  LogLevel,
  LogLevelNumber,
  Logger,
  LoggerFactory,
} from '@/core/logger';

const createLoggerFactory: LoggerFactory = (level: LogLevel = 'info') => {
  let logLevel: LogLevelNumber = 2;

  const setLogLevel = (level: LogLevel) => {
    switch (level) {
      case 'error':
        logLevel = 0;
        break;
      case 'warn':
        logLevel = 1;
        break;
      case 'info':
        logLevel = 2;
        break;
      case 'debug':
        logLevel = 3;
        break;
      default: {
        level satisfies never;
        throw new Error(`Invalid log level: ${level}`);
      }
    }
  };

  const createLogger = (source: string): Logger => {
    return {
      error: (...args: any[]) => {
        console.error(`[${new Date().toISOString()}] - [${source}] -`, ...args);
      },
      warn: (...args: any[]) => {
        if (logLevel < 1) {
          return;
        }
        console.warn(`[${new Date().toISOString()}] - [${source}] -`, ...args);
      },
      info: (...args: any[]) => {
        if (logLevel < 2) {
          return;
        }
        console.log(`[${new Date().toISOString()}] - [${source}] -`, ...args);
      },
      debug: (...args: any[]) => {
        if (logLevel < 3) {
          return;
        }
        console.debug(`[${new Date().toISOString()}] - [${source}] -`, ...args);
      },
    };
  };

  setLogLevel(level);
  return createLogger;
};

export { createLoggerFactory };
