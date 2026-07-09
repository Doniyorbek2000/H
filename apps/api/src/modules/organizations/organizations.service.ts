import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto, paginate } from '../../common/dto/pagination.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(query: PaginationQueryDto, actor: AuthUser) {
    const where: Prisma.OrganizationWhereInput = {};
    if (actor.role !== Role.SUPER_ADMIN) {
      where.id = actor.organizationId ?? '__none__';
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { region: { contains: query.search, mode: 'insensitive' } },
        { district: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        where,
        include: { _count: { select: { users: true, departments: true, appeals: true } } },
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.organization.count({ where }),
    ]);
    return paginate(data, total, query.page, query.limit);
  }

  async findOne(id: string, actor: AuthUser) {
    if (actor.role !== Role.SUPER_ADMIN && actor.organizationId !== id) {
      throw new ForbiddenException('Boshqa tashkilotni ko‘ra olmaysiz');
    }
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        departments: { include: { manager: { select: { id: true, fullName: true } } } },
        _count: { select: { users: true, appeals: true } },
      },
    });
    if (!org) throw new NotFoundException('Tashkilot topilmadi');
    return org;
  }

  async create(dto: CreateOrganizationDto, actor: AuthUser) {
    const org = await this.prisma.organization.create({ data: dto });
    await this.audit.log({
      userId: actor.id,
      action: 'ORG_CREATE',
      entity: 'Organization',
      entityId: org.id,
      newValue: { name: org.name },
    });
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto, actor: AuthUser) {
    if (actor.role !== Role.SUPER_ADMIN && actor.organizationId !== id) {
      throw new ForbiddenException('Boshqa tashkilotni o‘zgartira olmaysiz');
    }
    const old = await this.prisma.organization.findUnique({ where: { id } });
    if (!old) throw new NotFoundException('Tashkilot topilmadi');
    const org = await this.prisma.organization.update({ where: { id }, data: dto });
    await this.audit.log({
      userId: actor.id,
      action: 'ORG_UPDATE',
      entity: 'Organization',
      entityId: id,
      oldValue: { name: old.name },
      newValue: { name: org.name },
    });
    return org;
  }

  async remove(id: string, actor: AuthUser) {
    const org = await this.prisma.organization.delete({ where: { id } });
    await this.audit.log({
      userId: actor.id,
      action: 'ORG_DELETE',
      entity: 'Organization',
      entityId: id,
      oldValue: { name: org.name },
    });
    return { success: true };
  }
}
