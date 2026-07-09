import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto, paginate } from '../../common/dto/pagination.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

const userSelect = {
  id: true,
  fullName: true,
  phone: true,
  email: true,
  role: true,
  organizationId: true,
  departmentId: true,
  telegramChatId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  organization: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private scopeOrg(actor: AuthUser, dtoOrgId?: string): string | undefined {
    if (actor.role === Role.SUPER_ADMIN) return dtoOrgId;
    return actor.organizationId ?? undefined;
  }

  async findAll(
    query: PaginationQueryDto & { role?: Role; departmentId?: string; isActive?: string },
    actor: AuthUser,
  ) {
    const where: Prisma.UserWhereInput = {};
    if (actor.role !== Role.SUPER_ADMIN) {
      where.organizationId = actor.organizationId;
    }
    if (query.role) where.role = query.role;
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.isActive === 'true') where.isActive = true;
    if (query.isActive === 'false') where.isActive = false;
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [query.sortBy || 'createdAt']: query.sortOrder,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: userSelect,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(data, total, query.page, query.limit);
  }

  async findOne(id: string, actor: AuthUser) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (actor.role !== Role.SUPER_ADMIN && user.organizationId !== actor.organizationId) {
      throw new ForbiddenException('Boshqa tashkilot foydalanuvchisini ko‘ra olmaysiz');
    }
    return user;
  }

  async create(dto: CreateUserDto, actor: AuthUser) {
    const organizationId = this.scopeOrg(actor, dto.organizationId);
    if (dto.role === Role.SUPER_ADMIN && actor.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin yaratish faqat super adminga ruxsat');
    }
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email.toLowerCase() }, ...(dto.phone ? [{ phone: dto.phone }] : [])] },
    });
    if (exists) throw new BadRequestException('Bu email yoki telefon band');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        passwordHash,
        role: dto.role,
        organizationId,
        departmentId: dto.departmentId,
        isActive: dto.isActive ?? true,
      },
      select: userSelect,
    });
    await this.audit.log({
      userId: actor.id,
      action: 'USER_CREATE',
      entity: 'User',
      entityId: user.id,
      newValue: { email: user.email, role: user.role },
    });
    return user;
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthUser) {
    const existing = await this.findOne(id, actor);
    const data: Prisma.UserUpdateInput = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.email !== undefined) data.email = dto.email.toLowerCase();
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.role !== undefined) {
      if (dto.role === Role.SUPER_ADMIN && actor.role !== Role.SUPER_ADMIN) {
        throw new ForbiddenException('Super admin rolini berish mumkin emas');
      }
      data.role = dto.role;
    }
    if (dto.departmentId !== undefined) {
      data.department = dto.departmentId
        ? { connect: { id: dto.departmentId } }
        : { disconnect: true };
    }
    if (dto.organizationId !== undefined && actor.role === Role.SUPER_ADMIN) {
      data.organization = dto.organizationId
        ? { connect: { id: dto.organizationId } }
        : { disconnect: true };
    }
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.update({ where: { id }, data, select: userSelect });
    await this.audit.log({
      userId: actor.id,
      action: 'USER_UPDATE',
      entity: 'User',
      entityId: id,
      oldValue: { role: existing.role, isActive: existing.isActive },
      newValue: { role: user.role, isActive: user.isActive },
    });
    return user;
  }

  async remove(id: string, actor: AuthUser) {
    await this.findOne(id, actor);
    // Soft delete: faolsizlantiramiz (tarix saqlanadi)
    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: userSelect,
    });
    await this.audit.log({
      userId: actor.id,
      action: 'USER_DEACTIVATE',
      entity: 'User',
      entityId: id,
    });
    return user;
  }
}
