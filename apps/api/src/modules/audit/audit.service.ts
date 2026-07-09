import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto, paginate } from '../../common/dto/pagination.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';

export interface AuditEntry {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Audit yozuvi hech qachon asosiy oqimni buzmasligi kerak */
  async log(entry: AuditEntry) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          oldValue: entry.oldValue === undefined ? Prisma.JsonNull : (entry.oldValue as any),
          newValue: entry.newValue === undefined ? Prisma.JsonNull : (entry.newValue as any),
          ip: entry.ip,
          userAgent: entry.userAgent,
        },
      });
    } catch (e) {
      this.logger.warn(`Audit log yozilmadi: ${(e as Error).message}`);
    }
  }

  async findAll(query: PaginationQueryDto & { entity?: string; action?: string; userId?: string }, user: AuthUser) {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.entity) where.entity = query.entity;
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query.userId) where.userId = query.userId;
    if (user.role !== Role.SUPER_ADMIN && user.organizationId) {
      where.user = { organizationId: user.organizationId };
    }
    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { entity: { contains: query.search, mode: 'insensitive' } },
        { entityId: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, fullName: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginate(data, total, query.page, query.limit);
  }
}
