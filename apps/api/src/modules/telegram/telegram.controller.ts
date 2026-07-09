import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppealStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { AppealsService } from '../appeals/appeals.service';
import { Public } from '../../common/decorators/public.decorator';
import { BotSecretGuard } from './bot-secret.guard';
import { AuthUser } from '../../common/decorators/current-user.decorator';

/**
 * Telegram bot (apps/bot) uchun ichki API.
 * Barcha endpointlar X-Bot-Secret header bilan himoyalangan.
 */
@ApiTags('telegram')
@Public()
@UseGuards(BotSecretGuard)
@Controller('telegram')
export class TelegramController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
    private readonly appeals: AppealsService,
  ) {}

  private async staffByChatId(chatId: string) {
    const user = await this.prisma.user.findUnique({
      where: { telegramChatId: chatId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        organizationId: true,
        departmentId: true,
        isActive: true,
      },
    });
    if (!user || !user.isActive || user.role === Role.CITIZEN) {
      throw new NotFoundException('Bu chat xodim akkauntiga bog‘lanmagan');
    }
    return user;
  }

  @Get('staff/:chatId')
  async staff(@Param('chatId') chatId: string) {
    return this.staffByChatId(chatId);
  }

  @Get('staff/:chatId/summary')
  async summary(@Param('chatId') chatId: string) {
    const user = await this.staffByChatId(chatId);
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      departmentId: user.departmentId,
      fullName: user.fullName,
    };
    const overview = await this.dashboard.overview(authUser);
    return { user, overview };
  }

  @Get('staff/:chatId/overdue')
  async overdue(@Param('chatId') chatId: string) {
    const user = await this.staffByChatId(chatId);
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      departmentId: user.departmentId,
      fullName: user.fullName,
    };
    const list = await this.dashboard.overdueList(authUser);
    return list.map((a) => ({
      appealNumber: a.appealNumber,
      title: a.title,
      deadlineAt: a.deadlineAt,
      assignedTo: a.assignedTo?.fullName ?? null,
      department: a.department?.name ?? null,
    }));
  }

  @Get('staff/:chatId/today')
  async today(@Param('chatId') chatId: string) {
    const user = await this.staffByChatId(chatId);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const where =
      user.role === Role.EXECUTOR
        ? { assignedToId: user.id }
        : { organizationId: user.organizationId ?? '__none__' };
    const appeals = await this.prisma.appeal.findMany({
      where: { ...where, createdAt: { gte: startOfToday } },
      select: {
        appealNumber: true,
        title: true,
        status: true,
        priority: true,
        category: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return appeals;
  }

  @Get('citizen/:chatId/appeals')
  citizenAppeals(@Param('chatId') chatId: string) {
    return this.appeals.findByTelegramChat(chatId);
  }
}
