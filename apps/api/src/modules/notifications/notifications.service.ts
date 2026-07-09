import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TelegramSenderService } from './telegram-sender.service';
import { PaginationQueryDto, paginate } from '../../common/dto/pagination.dto';

interface NotifyInput {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  meta?: Record<string, unknown>;
  sendTelegram?: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramSenderService,
  ) {}

  /** Bitta foydalanuvchiga in-app (+ ixtiyoriy Telegram) notification */
  async notifyUser(input: NotifyInput) {
    try {
      await this.prisma.notification.create({
        data: {
          userId: input.userId,
          title: input.title,
          message: input.message,
          type: input.type ?? NotificationType.SYSTEM,
          meta: (input.meta as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        },
      });
      if (input.sendTelegram !== false) {
        const user = await this.prisma.user.findUnique({
          where: { id: input.userId },
          select: { telegramChatId: true },
        });
        if (user?.telegramChatId) {
          await this.telegram.sendMessage(
            user.telegramChatId,
            `<b>${input.title}</b>\n${input.message}`,
          );
        }
      }
    } catch (e) {
      this.logger.warn(`Notification yuborilmadi: ${(e as Error).message}`);
    }
  }

  /** Rol bo'yicha (tashkilot doirasida) hammani xabardor qilish */
  async notifyRole(params: {
    organizationId: string;
    roles: Role[];
    departmentId?: string;
    title: string;
    message: string;
    type?: NotificationType;
    meta?: Record<string, unknown>;
  }) {
    const users = await this.prisma.user.findMany({
      where: {
        organizationId: params.organizationId,
        role: { in: params.roles },
        isActive: true,
        ...(params.departmentId ? { departmentId: params.departmentId } : {}),
      },
      select: { id: true },
    });
    await Promise.all(
      users.map((u) =>
        this.notifyUser({
          userId: u.id,
          title: params.title,
          message: params.message,
          type: params.type,
          meta: params.meta,
        }),
      ),
    );
  }

  /** Fuqaroga to'g'ridan-to'g'ri Telegram orqali xabar (akkauntsiz, chatId orqali) */
  async notifyCitizenTelegram(chatId: string | null | undefined, text: string) {
    if (!chatId) return;
    await this.telegram.sendMessage(chatId, text);
  }

  async findForUser(userId: string, query: PaginationQueryDto & { unread?: string }) {
    const where: Prisma.NotificationWhereInput = { userId };
    if (query.unread === 'true') where.isRead = false;
    const [data, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { ...paginate(data, total, query.page, query.limit), unreadCount };
  }

  async markRead(id: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }
}
