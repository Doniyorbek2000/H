import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');
  private readonly sentryOn = Boolean(process.env.SENTRY_DSN);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Ichki server xatosi';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : ((res as any).message ?? message);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Bunday yozuv allaqachon mavjud (unique cheklov)';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Yozuv topilmadi';
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = 'Ma’lumotlar bazasi xatosi';
      }
    } else if (exception instanceof Error) {
      this.logger.error(`${request?.method} ${request?.url}: ${exception.message}`, exception.stack);
    }

    if (status >= 500) {
      this.logger.error(`${request?.method} ${request?.url} -> ${status}`);
      // Server xatolarini Sentry'ga yuborish (sozlangan bo'lsa)
      if (this.sentryOn && exception instanceof Error) {
        Sentry.captureException(exception, {
          extra: { path: request?.url, method: request?.method },
        });
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request?.url,
      timestamp: new Date().toISOString(),
    });
  }
}
