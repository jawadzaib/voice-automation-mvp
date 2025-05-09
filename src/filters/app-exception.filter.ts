import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { logger } from '../utils/logger';

@Catch()
export class AppExceptionFilter<T> implements ExceptionFilter {
  async catch(exception: T, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const service =
      exception && typeof exception === 'object' && 'constructor' in exception
        ? (exception as { constructor: { name: string } }).constructor.name
        : 'Exception';

    await logger.error(
      service,
      `Unhandled error: ${JSON.stringify(exception)}`,
    );

    response.status(status).json({
      error: message,
    });
  }
}
