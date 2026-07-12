import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

/**
 * E2E test uchun ilovani main.ts bilan bir xil sozlamalarda quradi
 * (global ValidationPipe + AllExceptionsFilter). Rate-limiter (ThrottlerGuard)
 * testlarda determinizm uchun o'chiriladi — aks holda ketma-ket so'rovlar 429 beradi.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return app;
}

/** Unikal test emaili (ma'lumotlar to'qnashuvining oldini olish uchun) */
export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@e2e.local`;
}

/** Unikal test telefoni */
export function uniquePhone(): string {
  return `+9989${String(Math.floor(Math.random() * 1_0000_0000)).padStart(8, '0')}`;
}
