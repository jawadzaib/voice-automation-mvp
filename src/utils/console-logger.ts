import { Logger, LogType } from 'src/types';

export const consoleLogger: Logger = async (
  service: string,
  error: any,
  logType?: LogType,
) => {
  switch (logType) {
    case 'info':
      console.info(`${service}: ${error}`);
      break;
    case 'error':
      console.error(`${service}: ${error}`);
      break;
    case 'warn':
      console.warn(`${service}: ${error}`);
      break;
    case 'debug':
      console.debug(`${service}: ${error}`);
      break;
    default:
      console.log(`${service}: ${error}`);
      break;
  }

  return Promise.resolve();
};
