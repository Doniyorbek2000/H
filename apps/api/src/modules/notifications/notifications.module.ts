import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TelegramSenderService } from './telegram-sender.service';
import { NotificationsGateway } from './notifications.gateway';
import { PushService } from './push.service';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, TelegramSenderService, NotificationsGateway, PushService],
  exports: [NotificationsService, TelegramSenderService, NotificationsGateway, PushService],
})
export class NotificationsModule {}
