import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  findAll(
    @Query() query: PaginationQueryDto,
    @Query('unread') unread: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findForUser(user.id, { ...query, unread });
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.markRead(id, user.id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.service.markAllRead(user.id);
  }

  @Post('send-test')
  sendTest(@CurrentUser() user: AuthUser, @Body() body: { message?: string }) {
    return this.service.notifyUser({
      userId: user.id,
      title: 'Test xabar',
      message: body?.message ?? 'Bu test notification. Tizim ishlayapti ✅',
      type: NotificationType.SYSTEM,
    });
  }
}
