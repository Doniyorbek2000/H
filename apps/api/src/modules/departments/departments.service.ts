import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto, paginate } from '../../common/dto/pagination.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(query: PaginationQueryDto & { organizationId?: string }, actor: AuthUser) {
    const where: Prisma.DepartmentWhereInput = {};
    if (actor.role === Role.SUPER_ADMIN) {
      if (query.organizationId) where.organizationId = query.organizationId;
    } else {
      where.organizationId = actor.organizationId ?? '__none__';
    }
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.department.findMany({
        where,
        include: {
          manager: { select: { id: true, fullName: true, email: true } },
          organization: { select: { id: true, name: true } },
          categories: { select: { id: true, name: true } },
          _count: { select: { users: true, appeals: true } },
        },
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.department.count({ where }),
    ]);
    return paginate(data, total, query.page, query.limit);
  }

  async findOne(id: string, actor: AuthUser) {
    const dep = await this.prisma.department.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, fullName: true } },
        users: { select: { id: true, fullName: true, role: true, isActive: true } },
        categories: true,
        _count: { select: { appeals: true } },
      },
    });
    if (!dep) throw new NotFoundException('Bo‘lim topilmadi');
    if (actor.role !== Role.SUPER_ADMIN && dep.organizationId !== actor.organizationId) {
      throw new ForbiddenException('Boshqa tashkilot bo‘limini ko‘ra olmaysiz');
    }
    return dep;
  }

  async create(dto: CreateDepartmentDto, actor: AuthUser) {
    const organizationId =
      actor.role === Role.SUPER_ADMIN ? dto.organizationId : actor.organizationId;
    if (!organizationId) throw new BadRequestException('organizationId majburiy');
    const dep = await this.prisma.department.create({
      data: {
        name: dto.name,
        organizationId,
        managerId: dto.managerId,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.log({
      userId: actor.id,
      action: 'DEPARTMENT_CREATE',
      entity: 'Department',
      entityId: dep.id,
      newValue: { name: dep.name },
    });
    return dep;
  }

  async update(id: string, dto: UpdateDepartmentDto, actor: AuthUser) {
    const old = await this.findOne(id, actor);
    const dep = await this.prisma.department.update({
      where: { id },
      data: {
        name: dto.name,
        managerId: dto.managerId === undefined ? undefined : dto.managerId || null,
        description: dto.description,
        isActive: dto.isActive,
      },
    });
    await this.audit.log({
      userId: actor.id,
      action: 'DEPARTMENT_UPDATE',
      entity: 'Department',
      entityId: id,
      oldValue: { name: old.name, managerId: old.managerId },
      newValue: { name: dep.name, managerId: dep.managerId },
    });
    return dep;
  }

  async remove(id: string, actor: AuthUser) {
    const dep = await this.findOne(id, actor);
    await this.prisma.department.update({ where: { id }, data: { isActive: false } });
    await this.audit.log({
      userId: actor.id,
      action: 'DEPARTMENT_DEACTIVATE',
      entity: 'Department',
      entityId: id,
      oldValue: { name: dep.name },
    });
    return { success: true };
  }
}
