import { forwardRef, Module } from '@nestjs/common';
import { AppealsService } from './appeals.service';
import { AppealsController } from './appeals.controller';
import { AppealQueueService } from './appeal-queue.service';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [forwardRef(() => FilesModule)],
  controllers: [AppealsController],
  providers: [AppealsService, AppealQueueService],
  exports: [AppealsService],
})
export class AppealsModule {}
