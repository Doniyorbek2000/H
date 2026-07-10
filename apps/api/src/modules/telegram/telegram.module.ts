import { Module } from '@nestjs/common';
import { TelegramController } from './telegram.controller';
import { DashboardModule } from '../dashboard/dashboard.module';
import { AppealsModule } from '../appeals/appeals.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [DashboardModule, AppealsModule, FilesModule],
  controllers: [TelegramController],
})
export class TelegramModule {}
