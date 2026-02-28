type LogLevel = 'error' | 'warn' | 'info' | 'debug';
type LogLevelNumber = 0 | 1 | 2 | 3;
interface Logger {
  error(...args: any[]): void;
  warn(...args: any[]): void;
  info(...args: any[]): void;
  debug(...args: any[]): void;
}

type LoggerCreator = (source: string) => Logger;
type LoggerFactory = (level: LogLevel) => LoggerCreator;

export type { LogLevel, LogLevelNumber, Logger, LoggerFactory, LoggerCreator };
