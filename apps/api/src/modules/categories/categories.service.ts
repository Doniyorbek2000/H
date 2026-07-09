import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto, paginate } from '../../common/dto/pagination.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(query: PaginationQueryDto & { isActive?: string }) {
    const where: Prisma.CategoryWhereInput = {};
    if (query.isActive === 'true') where.isActive = true;
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        include: {
          department: { select: { id: true, name: true } },
          _count: { select: { appeals: true } },
        },
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.category.count({ where }),
    ]);
    return paginate(data, total, query.page, query.limit);
  }

  async create(dto: CreateCategoryDto, actor: AuthUser) {
    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        description: dto.description,
        defaultDeadlineHours: dto.defaultDeadlineHours ?? 72,
        departmentId: dto.departmentId,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.log({
      userId: actor.id,
      action: 'CATEGORY_CREATE',
      entity: 'Category',
      entityId: category.id,
      newValue: { name: category.name },
    });
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto, actor: AuthUser) {
    const old = await this.prisma.category.findUnique({ where: { id } });
    if (!old) throw new NotFoundException('Kategoriya topilmadi');
    const category = await this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        defaultDeadlineHours: dto.defaultDeadlineHours,
        departmentId: dto.departmentId === undefined ? undefined : dto.departmentId || null,
        isActive: dto.isActive,
      },
    });
    await this.audit.log({
      userId: actor.id,
      action: 'CATEGORY_UPDATE',
      entity: 'Category',
      entityId: id,
      oldValue: old,
      newValue: category,
    });
    return category;
  }

  async remove(id: string, actor: AuthUser) {
    const category = await this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
    await this.audit.log({
      userId: actor.id,
      action: 'CATEGORY_DEACTIVATE',
      entity: 'Category',
      entityId: id,
      oldValue: { name: category.name },
    });
    return { success: true };
  }
}
