import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TelegramSenderService } from './telegram-sender.service';
import { NotificationsGateway } from './notifications.gateway';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, TelegramSenderService, NotificationsGateway],
  exports: [NotificationsService, TelegramSenderService, NotificationsGateway],
})
export class NotificationsModule {}
