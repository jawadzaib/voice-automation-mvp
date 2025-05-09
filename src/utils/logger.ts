import { Logger, LogType } from 'src/types';
import { consoleLogger } from './console-logger';

const log = (
  loggers: Logger[],
  service: string,
  message: string,
  logType?: LogType,
) => {
  const awaiting = loggers.map((logger) => logger(service, message, logType));
  return Promise.allSettled(awaiting);
};

const loggers = [consoleLogger];

export const logger = {
  debug: (service: string, message: string) =>
    log(loggers, service, message, 'debug'),
  info: (service: string, message: string) =>
    log(loggers, service, message, 'info'),
  error: (service: string, message: string) =>
    log(loggers, service, message, 'error'),
  warn: (service: string, message: string) =>
    log(loggers, service, message, 'warn'),
};
