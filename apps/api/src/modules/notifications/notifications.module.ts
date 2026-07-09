import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TelegramSenderService } from './telegram-sender.service';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, TelegramSenderService],
  exports: [NotificationsService, TelegramSenderService],
})
export class NotificationsModule {}
