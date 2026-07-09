import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

/** Kalitlar: deadline.default, ai.enabled, telegram.notifications, ... */
@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private orgId(actor: AuthUser): string | null {
    return actor.role === Role.SUPER_ADMIN ? null : actor.organizationId;
  }

  async getAll(actor: AuthUser) {
    const settings = await this.prisma.setting.findMany({
      where: { organizationId: this.orgId(actor) },
      orderBy: { key: 'asc' },
    });
    return {
      settings,
      system: {
        aiEnabled: Boolean(process.env.GEMINI_API_KEY),
        aiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        telegramEnabled: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      },
    };
  }

  async upsert(key: string, value: string, actor: AuthUser) {
    const organizationId = this.orgId(actor);
    const setting = await this.prisma.setting.upsert({
      where: { organizationId_key: { organizationId: organizationId as any, key } },
      update: { value },
      create: { organizationId, key, value },
    });
    await this.audit.log({
      userId: actor.id,
      action: 'SETTING_UPDATE',
      entity: 'Setting',
      entityId: setting.id,
      newValue: { key, value },
    });
    return setting;
  }
}
