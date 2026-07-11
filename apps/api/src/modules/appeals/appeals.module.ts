import { forwardRef, Module } from '@nestjs/common';
import { AppealsService } from './appeals.service';
import { AppealsController } from './appeals.controller';
import { AppealQueueService } from './appeal-queue.service';
import { FilesModule } from '../files/files.module';
import { GeoModule } from '../geo/geo.module';

@Module({
  imports: [forwardRef(() => FilesModule), GeoModule],
  controllers: [AppealsController],
  providers: [AppealsService, AppealQueueService],
  exports: [AppealsService],
})
export class AppealsModule {}
