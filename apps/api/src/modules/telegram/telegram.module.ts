import { Module } from '@nestjs/common';
import { TelegramController } from './telegram.controller';
import { DashboardModule } from '../dashboard/dashboard.module';
import { AppealsModule } from '../appeals/appeals.module';

@Module({
  imports: [DashboardModule, AppealsModule],
  controllers: [TelegramController],
})
export class TelegramModule {}
