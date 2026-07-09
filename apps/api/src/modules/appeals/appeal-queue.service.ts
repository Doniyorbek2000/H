import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { AppealsService } from './appeals.service';

const QUEUE_NAME = 'ai-analysis';

/**
 * BullMQ orqali AI tahlil navbati.
 * Redis mavjud bo'lmasa — job to'g'ridan-to'g'ri (inline) bajariladi,
 * tizim ishlashda davom etadi.
 */
@Injectable()
export class AppealQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppealQueueService.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private redisAvailable = false;

  constructor(
    @Inject(forwardRef(() => AppealsService))
    private readonly appealsService: AppealsService,
  ) {}

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      const probe = new IORedis(redisUrl, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        retryStrategy: () => null,
      });
      await probe.connect();
      await probe.ping();
      await probe.quit();
      this.redisAvailable = true;

      const parsed = new URL(redisUrl);
      const connection = {
        host: parsed.hostname || 'localhost',
        port: parseInt(parsed.port || '6379', 10),
        ...(parsed.password ? { password: parsed.password } : {}),
        maxRetriesPerRequest: null,
      };
      this.queue = new Queue(QUEUE_NAME, {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      });
      this.worker = new Worker(
        QUEUE_NAME,
        async (job) => {
          await this.appealsService.runAiAnalysis(job.data.appealId);
        },
        { connection, concurrency: 2 },
      );
      this.worker.on('failed', (job, err) => {
        this.logger.warn(`AI job xato (${job?.id}): ${err.message}`);
      });
      this.logger.log('BullMQ AI-analysis navbati ishga tushdi (Redis ulandi)');
    } catch {
      this.redisAvailable = false;
      this.logger.warn('Redis mavjud emas — AI tahlil inline rejimda ishlaydi');
    }
  }

  /** Murojaatni AI tahlilga qo'yish */
  async enqueueAnalysis(appealId: string) {
    if (this.redisAvailable && this.queue) {
      try {
        await this.queue.add('analyze', { appealId });
        return;
      } catch (e) {
        this.logger.warn(`Queue xatosi, inline rejimga o'tildi: ${(e as Error).message}`);
      }
    }
    // Fallback: fon rejimida to'g'ridan-to'g'ri ishga tushiramiz
    setImmediate(() => {
      this.appealsService
        .runAiAnalysis(appealId)
        .catch((e) => this.logger.warn(`Inline AI tahlil xatosi: ${e.message}`));
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }
}
