import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import * as Sentry from '@sentry/node';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import type { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  // Xatolarni kuzatish (SENTRY_DSN berilsa)
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1,
    });
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  const logger = app.get(PinoLogger);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({
    origin: (process.env.WEB_URL || 'http://localhost:3000').split(','),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  // Diqqat: yuklangan fayllar himoyalangan /files/:id/raw orqali beriladi.
  // Umumiy /static statik-serverdan VOZ KECHILDI (autentifikatsiyasiz PII fosh bo'lardi).

  if (process.env.SWAGGER_ENABLED !== 'false') {
    const config = new DocumentBuilder()
      .setTitle('Smart Murojaat AI API')
      .setDescription(
        'Hokimliklar va davlat tashkilotlari uchun AI asosidagi murojaatlar platformasi API hujjati',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = parseInt(process.env.API_PORT || '3001', 10);
  await app.listen(port);
  logger.log(`API http://localhost:${port} | Swagger: /docs`);
}
bootstrap();
