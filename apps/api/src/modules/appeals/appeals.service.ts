import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AppealPriority,
  AppealSource,
  AppealStatus,
  NotificationType,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AppealQueueService } from './appeal-queue.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto, paginate } from '../../common/dto/pagination.dto';
import {
  AssignAppealDto,
  ChangeStatusDto,
  CloseDto,
  CommentDto,
  CreateAppealDto,
  RateDto,
  RejectDto,
  UpdateAppealDto,
} from './dto/appeal.dto';

const OPEN_STATUSES: AppealStatus[] = [
  AppealStatus.NEW,
  AppealStatus.AI_ANALYZING,
  AppealStatus.OPERATOR_REVIEW,
  AppealStatus.ASSIGNED,
  AppealStatus.ACCEPTED,
  AppealStatus.IN_PROGRESS,
  AppealStatus.WAITING_CITIZEN_INFO,
  AppealStatus.WAITING_EVIDENCE,
  AppealStatus.REOPENED,
  AppealStatus.OVERDUE,
];

/** Ruxsat etilgan status o'tishlari */
const STATUS_TRANSITIONS: Record<AppealStatus, AppealStatus[]> = {
  [AppealStatus.NEW]: [AppealStatus.AI_ANALYZING, AppealStatus.OPERATOR_REVIEW, AppealStatus.REJECTED],
  [AppealStatus.AI_ANALYZING]: [AppealStatus.OPERATOR_REVIEW, AppealStatus.REJECTED],
  [AppealStatus.OPERATOR_REVIEW]: [
    AppealStatus.ASSIGNED,
    AppealStatus.WAITING_CITIZEN_INFO,
    AppealStatus.REJECTED,
  ],
  [AppealStatus.ASSIGNED]: [
    AppealStatus.ACCEPTED,
    AppealStatus.IN_PROGRESS,
    AppealStatus.OPERATOR_REVIEW,
    AppealStatus.REJECTED,
  ],
  [AppealStatus.ACCEPTED]: [
    AppealStatus.IN_PROGRESS,
    AppealStatus.WAITING_CITIZEN_INFO,
    AppealStatus.WAITING_EVIDENCE,
  ],
  [AppealStatus.IN_PROGRESS]: [
    AppealStatus.WAITING_CITIZEN_INFO,
    AppealStatus.WAITING_EVIDENCE,
    AppealStatus.COMPLETED,
  ],
  [AppealStatus.WAITING_CITIZEN_INFO]: [
    AppealStatus.IN_PROGRESS,
    AppealStatus.OPERATOR_REVIEW,
    AppealStatus.REJECTED,
  ],
  [AppealStatus.WAITING_EVIDENCE]: [AppealStatus.IN_PROGRESS, AppealStatus.COMPLETED],
  [AppealStatus.COMPLETED]: [AppealStatus.CLOSED, AppealStatus.REOPENED],
  [AppealStatus.REJECTED]: [AppealStatus.REOPENED, AppealStatus.CLOSED],
  [AppealStatus.REOPENED]: [
    AppealStatus.OPERATOR_REVIEW,
    AppealStatus.ASSIGNED,
    AppealStatus.IN_PROGRESS,
  ],
  [AppealStatus.OVERDUE]: [
    AppealStatus.IN_PROGRESS,
    AppealStatus.COMPLETED,
    AppealStatus.ASSIGNED,
    AppealStatus.REJECTED,
  ],
  [AppealStatus.CLOSED]: [AppealStatus.REOPENED],
};

const appealListInclude = {
  category: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, fullName: true } },
  organization: { select: { id: true, name: true } },
  _count: { select: { comments: true, attachments: true } },
} satisfies Prisma.AppealInclude;

@Injectable()
export class AppealsService {
  private readonly logger = new Logger(AppealsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    @Inject(forwardRef(() => AppealQueueService))
    private readonly queue: AppealQueueService,
  ) {}

  // ============ YARATISH ============

  private async generateAppealNumber(): Promise<string> {
    const today = new Date();
    const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
      today.getDate(),
    ).padStart(2, '0')}`;
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const count = await this.prisma.appeal.count({ where: { createdAt: { gte: startOfDay } } });
    return `SM-${datePart}-${String(count + 1).padStart(4, '0')}`;
  }

  /** Yaratishda takroriy murojaatni aniqlash (oxirgi 14 kun, oddiy semantik o'xshashlik) */
  private async detectDuplicate(
    organizationId: string,
    title: string,
    description: string,
  ): Promise<string | null> {
    const since = new Date(Date.now() - 14 * 24 * 3600 * 1000);
    const candidates = await this.prisma.appeal.findMany({
      where: { organizationId, createdAt: { gte: since }, status: { in: OPEN_STATUSES } },
      select: { id: true, title: true, description: true, duplicateGroupId: true },
      take: 300,
      orderBy: { createdAt: 'desc' },
    });
    const text = `${title} ${description}`;
    for (const c of candidates) {
      const score = this.ai.similarity(text, `${c.title} ${c.description}`);
      if (score >= 0.55) {
        return c.duplicateGroupId ?? c.id;
      }
    }
    return null;
  }

  async create(dto: CreateAppealDto, actor?: AuthUser | null) {
    let organizationId = dto.organizationId;
    if (actor && actor.role !== Role.SUPER_ADMIN && actor.organizationId) {
      organizationId = actor.organizationId;
    }
    if (!organizationId) {
      // Public murojaat: birinchi tashkilotga tushadi (bitta hokimlik MVP rejimi)
      const org = await this.prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
      if (!org) throw new BadRequestException('Tizimda tashkilot mavjud emas');
      organizationId = org.id;
    }

    const appealNumber = await this.generateAppealNumber();
    const duplicateGroupId = await this.detectDuplicate(
      organizationId,
      dto.title,
      dto.description,
    );

    let deadlineAt: Date | null = null;
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (category) {
        deadlineAt = new Date(Date.now() + category.defaultDeadlineHours * 3600 * 1000);
      }
    }

    const appeal = await this.prisma.appeal.create({
      data: {
        appealNumber,
        title: dto.title,
        description: dto.description,
        citizenName: dto.citizenName,
        citizenPhone: dto.citizenPhone,
        citizenJshshir: dto.citizenJshshir,
        source: dto.source ?? AppealSource.WEB,
        status: AppealStatus.NEW,
        categoryId: dto.categoryId,
        organizationId,
        createdById: actor?.id,
        region: dto.region,
        district: dto.district,
        mahalla: dto.mahalla,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        deadlineAt,
        duplicateGroupId,
        citizenTelegramChatId: dto.citizenTelegramChatId,
        statusHistory: {
          create: { toStatus: AppealStatus.NEW, changedById: actor?.id, comment: 'Murojaat yaratildi' },
        },
      },
      include: appealListInclude,
    });

    await this.audit.log({
      userId: actor?.id,
      action: 'APPEAL_CREATE',
      entity: 'Appeal',
      entityId: appeal.id,
      newValue: { appealNumber, title: dto.title, source: appeal.source },
    });

    // Operatorlarga xabar (Telegramda tasdiqlash/rad etish tugmalari bilan)
    await this.notifications.notifyRole({
      organizationId,
      roles: [Role.OPERATOR, Role.ADMIN],
      title: 'Yangi murojaat',
      message: `${appealNumber}: ${dto.title}`,
      type: NotificationType.APPEAL_CREATED,
      meta: { appealId: appeal.id },
      telegramButtons: [
        [
          { text: '✅ Tasdiqlash', callback_data: `apr:${appeal.id}` },
          { text: '❌ Rad etish', callback_data: `rej:${appeal.id}` },
        ],
      ],
    });

    // AI tahlilni navbatga qo'yamiz
    await this.queue.enqueueAnalysis(appeal.id);

    return appeal;
  }

  /** Tashkilot (yoki global) 'deadline.default' sozlamasi, bo'lmasa 72 soat */
  private async getDefaultDeadlineHours(organizationId: string): Promise<number> {
    const settings = await this.prisma.setting.findMany({
      where: { key: 'deadline.default', OR: [{ organizationId }, { organizationId: null }] },
    });
    const org = settings.find((s) => s.organizationId === organizationId);
    const globalSetting = settings.find((s) => s.organizationId === null);
    const value = parseInt(org?.value ?? globalSetting?.value ?? '', 10);
    return Number.isFinite(value) && value > 0 ? value : 72;
  }

  // ============ AI TAHLIL ============

  /** Queue worker chaqiradigan metod */
  async runAiAnalysis(appealId: string) {
    const appeal = await this.prisma.appeal.findUnique({
      where: { id: appealId },
      include: { organization: true },
    });
    if (!appeal) return;

    await this.setStatusInternal(appealId, AppealStatus.AI_ANALYZING, null, 'AI tahlil boshlandi');

    const [categories, departments] = await Promise.all([
      this.prisma.category.findMany({ where: { isActive: true }, select: { name: true } }),
      this.prisma.department.findMany({
        where: { organizationId: appeal.organizationId, isActive: true },
        select: { id: true, name: true },
      }),
    ]);

    const result = await this.ai.analyzeAppeal({
      title: appeal.title,
      text: appeal.description,
      region: appeal.region,
      district: appeal.district,
      mahalla: appeal.mahalla,
      categories: categories.map((c) => c.name),
      departments: departments.map((d) => d.name),
    });

    // AI taklif qilgan kategoriya bo'yicha muddat (fallback: org sozlamasi -> 72)
    const matchedCategory = await this.prisma.category.findFirst({
      where: { name: { equals: result.category, mode: 'insensitive' } },
    });
    const orgDefault = await this.getDefaultDeadlineHours(appeal.organizationId);
    const deadlineHours =
      result.deadlineHours || matchedCategory?.defaultDeadlineHours || orgDefault;

    await this.prisma.appeal.update({
      where: { id: appealId },
      data: {
        aiSummary: result.summary,
        aiCategorySuggestion: result.category,
        aiPrioritySuggestion: result.priority,
        aiDepartmentSuggestion: result.departmentSuggestion,
        aiResponseDraft: result.responseDraft,
        aiSentiment: result.sentiment,
        aiMissingInfo: result.missingInfo,
        aiKeywords: result.keywords,
        priority: result.priority,
        categoryId: appeal.categoryId ?? matchedCategory?.id,
        deadlineAt: appeal.deadlineAt ?? new Date(Date.now() + deadlineHours * 3600 * 1000),
      },
    });

    await this.setStatusInternal(
      appealId,
      AppealStatus.OPERATOR_REVIEW,
      null,
      `AI tahlil yakunlandi (${result.engine})`,
    );

    await this.notifications.notifyRole({
      organizationId: appeal.organizationId,
      roles: [Role.OPERATOR, Role.ADMIN],
      title: 'AI tavsiya tayyor',
      message: `${appeal.appealNumber}: kategoriya "${result.category}", ustuvorlik ${result.priority}`,
      type: NotificationType.AI_READY,
      meta: { appealId },
    });

    // Shoshilinch murojaat — rahbarlarni darhol ogohlantirish
    if (result.priority === 'URGENT') {
      await this.notifications.notifyRole({
        organizationId: appeal.organizationId,
        roles: [Role.LEADER, Role.MANAGER],
        title: '🚨 Shoshilinch murojaat!',
        message: `${appeal.appealNumber}: ${appeal.title} (${result.category})`,
        type: NotificationType.OVERDUE_ALERT,
        meta: { appealId },
      });
    }

    this.logger.log(`AI tahlil yakunlandi: ${appeal.appealNumber} (${result.engine})`);
  }

  /** Operator qo'lda qayta tahlil chaqirishi */
  async analyzeNow(id: string, actor: AuthUser) {
    await this.findOne(id, actor);
    await this.runAiAnalysis(id);
    return this.findOne(id, actor);
  }

  // ============ RO'YXAT / BITTA ============

  private buildScope(actor: AuthUser): Prisma.AppealWhereInput {
    switch (actor.role) {
      case Role.SUPER_ADMIN:
        return {};
      case Role.EXECUTOR:
        return { OR: [{ assignedToId: actor.id }, { coAssignees: { some: { userId: actor.id } } }] };
      case Role.MANAGER:
        return {
          organizationId: actor.organizationId ?? '__none__',
          ...(actor.departmentId ? { departmentId: actor.departmentId } : {}),
        };
      case Role.CITIZEN:
        return { createdById: actor.id };
      default:
        // ADMIN, OPERATOR, LEADER
        return { organizationId: actor.organizationId ?? '__none__' };
    }
  }

  async findAll(
    query: PaginationQueryDto & {
      status?: AppealStatus;
      priority?: AppealPriority;
      categoryId?: string;
      departmentId?: string;
      assignedToId?: string;
      source?: AppealSource;
      mahalla?: string;
      overdue?: string;
      hasLocation?: string;
    },
    actor: AuthUser,
  ) {
    const where: Prisma.AppealWhereInput = { ...this.buildScope(actor) };
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.assignedToId) where.assignedToId = query.assignedToId;
    if (query.source) where.source = query.source;
    if (query.mahalla) where.mahalla = { contains: query.mahalla, mode: 'insensitive' };
    if (query.overdue === 'true') {
      where.OR = [
        { status: AppealStatus.OVERDUE },
        { deadlineAt: { lt: new Date() }, status: { in: OPEN_STATUSES } },
      ];
    }
    if (query.hasLocation === 'true') {
      where.latitude = { not: null };
      where.longitude = { not: null };
    }
    if (query.search) {
      where.AND = [
        {
          OR: [
            { appealNumber: { contains: query.search, mode: 'insensitive' } },
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { citizenName: { contains: query.search, mode: 'insensitive' } },
            { citizenPhone: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      ];
    }
    const sortField = ['createdAt', 'updatedAt', 'deadlineAt', 'priority', 'status'].includes(
      query.sortBy || '',
    )
      ? query.sortBy!
      : 'createdAt';
    const [data, total] = await this.prisma.$transaction([
      this.prisma.appeal.findMany({
        where,
        include: appealListInclude,
        orderBy: { [sortField]: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.appeal.count({ where }),
    ]);
    return paginate(data, total, query.page, query.limit);
  }

  async findOne(id: string, actor: AuthUser) {
    const appeal = await this.prisma.appeal.findUnique({
      where: { id },
      include: {
        ...appealListInclude,
        comments: {
          include: { user: { select: { id: true, fullName: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        attachments: {
          include: { uploadedBy: { select: { id: true, fullName: true } } },
        },
        statusHistory: {
          include: { changedBy: { select: { id: true, fullName: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        createdBy: { select: { id: true, fullName: true } },
        coAssignees: {
          include: { user: { select: { id: true, fullName: true, role: true } } },
        },
      },
    });
    if (!appeal) throw new NotFoundException('Murojaat topilmadi');
    this.assertAccess(appeal, actor);
    if (actor.role === Role.CITIZEN) {
      appeal.comments = appeal.comments.filter((c) => !c.isInternal);
    }

    // Takroriy guruhga kiruvchi boshqa murojaatlar
    let duplicates: { id: string; appealNumber: string; title: string; status: AppealStatus }[] = [];
    if (appeal.duplicateGroupId) {
      duplicates = await this.prisma.appeal.findMany({
        where: {
          id: { not: appeal.id },
          OR: [{ duplicateGroupId: appeal.duplicateGroupId }, { id: appeal.duplicateGroupId }],
        },
        select: { id: true, appealNumber: true, title: true, status: true },
        take: 10,
      });
    } else {
      duplicates = await this.prisma.appeal.findMany({
        where: { duplicateGroupId: appeal.id },
        select: { id: true, appealNumber: true, title: true, status: true },
        take: 10,
      });
    }
    return { ...appeal, duplicates };
  }

  /** Murojaatga kirish huquqini tekshirish (fayl kirishida ham qayta ishlatiladi) */
  assertAccess(
    appeal: {
      organizationId: string;
      assignedToId: string | null;
      createdById: string | null;
      coAssignees?: { userId: string }[];
    },
    actor: AuthUser,
  ) {
    if (actor.role === Role.SUPER_ADMIN) return;
    if (actor.role === Role.EXECUTOR) {
      const isCoAssignee = appeal.coAssignees?.some((c) => c.userId === actor.id) ?? false;
      if (appeal.assignedToId !== actor.id && !isCoAssignee) {
        throw new ForbiddenException('Bu murojaat sizga biriktirilmagan');
      }
      return;
    }
    if (actor.role === Role.CITIZEN) {
      if (appeal.createdById !== actor.id) {
        throw new ForbiddenException('Faqat o‘z murojaatingizni ko‘ra olasiz');
      }
      return;
    }
    if (appeal.organizationId !== actor.organizationId) {
      throw new ForbiddenException('Boshqa tashkilot murojaatini ko‘ra olmaysiz');
    }
  }

  // ============ YANGILASH / ASSIGN / STATUS ============

  async update(id: string, dto: UpdateAppealDto, actor: AuthUser) {
    const old = await this.findOne(id, actor);
    const appeal = await this.prisma.appeal.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        categoryId: dto.categoryId,
        departmentId: dto.departmentId,
        priority: dto.priority,
        region: dto.region,
        district: dto.district,
        mahalla: dto.mahalla,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
      include: appealListInclude,
    });
    await this.audit.log({
      userId: actor.id,
      action: 'APPEAL_UPDATE',
      entity: 'Appeal',
      entityId: id,
      oldValue: { title: old.title, priority: old.priority },
      newValue: { title: appeal.title, priority: appeal.priority },
    });
    return appeal;
  }

  async assign(id: string, dto: AssignAppealDto, actor: AuthUser) {
    const appeal = await this.findOne(id, actor);
    if (!dto.departmentId && !dto.assignedToId) {
      throw new BadRequestException('Bo‘lim yoki xodim tanlanishi kerak');
    }
    let departmentId = dto.departmentId;
    if (dto.assignedToId) {
      const executor = await this.prisma.user.findUnique({ where: { id: dto.assignedToId } });
      if (!executor || !executor.isActive) {
        throw new BadRequestException('Xodim topilmadi yoki faol emas');
      }
      departmentId = departmentId ?? executor.departmentId ?? undefined;
    }
    const deadlineAt = dto.deadlineHours
      ? new Date(Date.now() + dto.deadlineHours * 3600 * 1000)
      : appeal.deadlineAt;

    const updated = await this.prisma.appeal.update({
      where: { id },
      data: {
        departmentId,
        assignedToId: dto.assignedToId,
        priority: dto.priority ?? appeal.priority,
        deadlineAt,
        status: AppealStatus.ASSIGNED,
        reminder24Sent: false,
        reminder6Sent: false,
        statusHistory: {
          create: {
            fromStatus: appeal.status,
            toStatus: AppealStatus.ASSIGNED,
            changedById: actor.id,
            comment: dto.comment ?? 'Murojaat biriktirildi',
          },
        },
      },
      include: appealListInclude,
    });

    await this.audit.log({
      userId: actor.id,
      action: 'APPEAL_ASSIGN',
      entity: 'Appeal',
      entityId: id,
      oldValue: { assignedToId: appeal.assignedToId, departmentId: appeal.departmentId },
      newValue: { assignedToId: dto.assignedToId, departmentId },
    });

    if (dto.assignedToId) {
      await this.notifications.notifyUser({
        userId: dto.assignedToId,
        title: 'Sizga yangi vazifa biriktirildi',
        message: `${updated.appealNumber}: ${updated.title}. Muddat: ${
          updated.deadlineAt ? new Date(updated.deadlineAt).toLocaleString('uz-UZ') : 'belgilanmagan'
        }`,
        type: NotificationType.ASSIGNED,
        meta: { appealId: id },
      });
    } else if (departmentId) {
      const manager = await this.prisma.department.findUnique({
        where: { id: departmentId },
        select: { managerId: true, name: true },
      });
      if (manager?.managerId) {
        await this.notifications.notifyUser({
          userId: manager.managerId,
          title: 'Bo‘limingizga yangi murojaat',
          message: `${updated.appealNumber}: ${updated.title}`,
          type: NotificationType.ASSIGNED,
          meta: { appealId: id },
        });
      }
    }
    return updated;
  }

  private async setStatusInternal(
    appealId: string,
    toStatus: AppealStatus,
    changedById: string | null,
    comment?: string,
  ) {
    const appeal = await this.prisma.appeal.findUnique({ where: { id: appealId } });
    if (!appeal || appeal.status === toStatus) return;
    await this.prisma.appeal.update({
      where: { id: appealId },
      data: {
        status: toStatus,
        statusHistory: {
          create: { fromStatus: appeal.status, toStatus, changedById, comment },
        },
      },
    });
  }

  async changeStatus(id: string, dto: ChangeStatusDto, actor: AuthUser) {
    const appeal = await this.findOne(id, actor);
    const allowed = STATUS_TRANSITIONS[appeal.status] ?? [];
    const isAdmin = actor.role === Role.SUPER_ADMIN || actor.role === Role.ADMIN;
    if (!allowed.includes(dto.status) && !isAdmin) {
      throw new BadRequestException(
        `"${appeal.status}" holatidan "${dto.status}" holatiga o‘tish mumkin emas`,
      );
    }
    const data: Prisma.AppealUpdateInput = {
      status: dto.status,
      statusHistory: {
        create: {
          fromStatus: appeal.status,
          toStatus: dto.status,
          changedById: actor.id,
          comment: dto.comment,
        },
      },
    };
    if (dto.status === AppealStatus.COMPLETED) data.completedAt = new Date();
    if (dto.status === AppealStatus.CLOSED) data.closedAt = new Date();

    const updated = await this.prisma.appeal.update({
      where: { id },
      data,
      include: appealListInclude,
    });

    await this.audit.log({
      userId: actor.id,
      action: 'APPEAL_STATUS_CHANGE',
      entity: 'Appeal',
      entityId: id,
      oldValue: { status: appeal.status },
      newValue: { status: dto.status, comment: dto.comment },
    });

    // Fuqaroga Telegram xabar (bot orqali kelgan bo'lsa)
    if (updated.citizenTelegramChatId) {
      const { STATUS_LABELS_UZ } = await import('@smart/shared');
      await this.notifications.notifyCitizenTelegram(
        updated.citizenTelegramChatId,
        `📋 <b>${updated.appealNumber}</b> murojaatingiz holati yangilandi: <b>${
          STATUS_LABELS_UZ[dto.status] ?? dto.status
        }</b>${dto.comment ? `\n💬 ${dto.comment}` : ''}`,
      );
    }
    // Biriktirilgan xodimga xabar
    if (updated.assignedToId && updated.assignedToId !== actor.id) {
      await this.notifications.notifyUser({
        userId: updated.assignedToId,
        title: 'Murojaat holati o‘zgardi',
        message: `${updated.appealNumber}: ${appeal.status} → ${dto.status}`,
        type: NotificationType.STATUS_CHANGED,
        meta: { appealId: id },
      });
    }
    return updated;
  }

  // ============ IZOH / YOPISH / RAD / QAYTA OCHISH / BAHO ============

  async addComment(id: string, dto: CommentDto, actor: AuthUser) {
    await this.findOne(id, actor);
    const comment = await this.prisma.appealComment.create({
      data: {
        appealId: id,
        userId: actor.id,
        message: dto.message,
        isInternal: dto.isInternal ?? false,
      },
      include: { user: { select: { id: true, fullName: true, role: true } } },
    });
    await this.audit.log({
      userId: actor.id,
      action: 'APPEAL_COMMENT',
      entity: 'Appeal',
      entityId: id,
      newValue: { isInternal: comment.isInternal },
    });
    return comment;
  }

  async close(id: string, dto: CloseDto, actor: AuthUser) {
    const appeal = await this.findOne(id, actor);
    let finalResponse = dto.finalResponse;
    if (!finalResponse) {
      finalResponse = await this.ai.generateCitizenResponse({
        title: appeal.title,
        description: appeal.description,
        status: 'COMPLETED',
        categoryName: appeal.category?.name,
        resolution: appeal.aiResponseDraft,
      });
    }
    const updated = await this.prisma.appeal.update({
      where: { id },
      data: {
        status: AppealStatus.CLOSED,
        closedAt: new Date(),
        aiResponseDraft: finalResponse,
        statusHistory: {
          create: {
            fromStatus: appeal.status,
            toStatus: AppealStatus.CLOSED,
            changedById: actor.id,
            comment: 'Murojaat yopildi',
          },
        },
        comments: {
          create: { userId: actor.id, message: finalResponse, isInternal: false },
        },
      },
      include: appealListInclude,
    });
    await this.audit.log({
      userId: actor.id,
      action: 'APPEAL_CLOSE',
      entity: 'Appeal',
      entityId: id,
      oldValue: { status: appeal.status },
    });
    if (updated.citizenTelegramChatId) {
      await this.notifications.notifyCitizenTelegram(
        updated.citizenTelegramChatId,
        `✅ <b>${updated.appealNumber}</b> murojaatingiz yakunlandi.\n\n${finalResponse}\n\nXizmatimizni 1-5 ball bilan baholang: /baho_${updated.appealNumber.replace(/-/g, '_')}`,
      );
    }
    return updated;
  }

  async reject(id: string, dto: RejectDto, actor: AuthUser) {
    const appeal = await this.findOne(id, actor);
    const updated = await this.prisma.appeal.update({
      where: { id },
      data: {
        status: AppealStatus.REJECTED,
        rejectedReason: dto.reason,
        closedAt: new Date(),
        statusHistory: {
          create: {
            fromStatus: appeal.status,
            toStatus: AppealStatus.REJECTED,
            changedById: actor.id,
            comment: dto.reason,
          },
        },
      },
      include: appealListInclude,
    });
    await this.audit.log({
      userId: actor.id,
      action: 'APPEAL_REJECT',
      entity: 'Appeal',
      entityId: id,
      newValue: { reason: dto.reason },
    });
    if (updated.citizenTelegramChatId) {
      await this.notifications.notifyCitizenTelegram(
        updated.citizenTelegramChatId,
        `❌ <b>${updated.appealNumber}</b> murojaatingiz rad etildi.\nSabab: ${dto.reason}`,
      );
    }
    return updated;
  }

  async reopen(id: string, dto: CommentDto, actor: AuthUser) {
    const appeal = await this.findOne(id, actor);
    const reopenable: AppealStatus[] = [
      AppealStatus.COMPLETED,
      AppealStatus.CLOSED,
      AppealStatus.REJECTED,
    ];
    if (!reopenable.includes(appeal.status)) {
      throw new BadRequestException('Faqat yakunlangan murojaatni qayta ochish mumkin');
    }
    const updated = await this.prisma.appeal.update({
      where: { id },
      data: {
        status: AppealStatus.REOPENED,
        closedAt: null,
        completedAt: null,
        statusHistory: {
          create: {
            fromStatus: appeal.status,
            toStatus: AppealStatus.REOPENED,
            changedById: actor.id,
            comment: dto.message,
          },
        },
        comments: { create: { userId: actor.id, message: dto.message, isInternal: false } },
      },
      include: appealListInclude,
    });
    await this.audit.log({
      userId: actor.id,
      action: 'APPEAL_REOPEN',
      entity: 'Appeal',
      entityId: id,
      newValue: { reason: dto.message },
    });
    if (updated.assignedToId) {
      await this.notifications.notifyUser({
        userId: updated.assignedToId,
        title: 'Murojaat qayta ochildi',
        message: `${updated.appealNumber}: ${dto.message}`,
        type: NotificationType.STATUS_CHANGED,
        meta: { appealId: id },
      });
    }
    return updated;
  }

  async rate(id: string, dto: RateDto, actor?: AuthUser | null) {
    const appeal = await this.prisma.appeal.findUnique({ where: { id } });
    if (!appeal) throw new NotFoundException('Murojaat topilmadi');
    const rateable: AppealStatus[] = [AppealStatus.COMPLETED, AppealStatus.CLOSED];
    if (!rateable.includes(appeal.status)) {
      throw new BadRequestException('Faqat yakunlangan murojaatni baholash mumkin');
    }
    const updated = await this.prisma.appeal.update({
      where: { id },
      data: { citizenRating: dto.rating, citizenFeedback: dto.feedback },
    });
    await this.audit.log({
      userId: actor?.id,
      action: 'APPEAL_RATE',
      entity: 'Appeal',
      entityId: id,
      newValue: { rating: dto.rating },
    });
    return { success: true, rating: updated.citizenRating };
  }

  /** Takroriy murojaatni asosiy murojaatga birlashtirish */
  async merge(id: string, targetAppealNumber: string, comment: string | undefined, actor: AuthUser) {
    const appeal = await this.findOne(id, actor);
    const target = await this.prisma.appeal.findUnique({
      where: { appealNumber: targetAppealNumber },
    });
    if (!target) throw new NotFoundException('Asosiy murojaat topilmadi');
    if (target.id === id) throw new BadRequestException('Murojaatni o‘ziga birlashtirib bo‘lmaydi');
    this.assertAccess(target, actor);

    const groupId = target.duplicateGroupId ?? target.id;
    await this.prisma.$transaction([
      // Asosiy murojaat guruh boshi bo'ladi
      this.prisma.appeal.update({
        where: { id: target.id },
        data: { duplicateGroupId: groupId },
      }),
      this.prisma.appeal.update({
        where: { id },
        data: {
          duplicateGroupId: groupId,
          status: AppealStatus.REJECTED,
          rejectedReason: `Takroriy murojaat — ${target.appealNumber} bilan birlashtirildi`,
          closedAt: new Date(),
          statusHistory: {
            create: {
              fromStatus: appeal.status,
              toStatus: AppealStatus.REJECTED,
              changedById: actor.id,
              comment: comment ?? `${target.appealNumber} bilan birlashtirildi (takroriy)`,
            },
          },
        },
      }),
    ]);

    await this.audit.log({
      userId: actor.id,
      action: 'APPEAL_MERGE',
      entity: 'Appeal',
      entityId: id,
      newValue: { mergedInto: target.appealNumber, groupId },
    });

    if (appeal.citizenTelegramChatId) {
      await this.notifications.notifyCitizenTelegram(
        appeal.citizenTelegramChatId,
        `ℹ️ <b>${appeal.appealNumber}</b> murojaatingiz avval yuborilgan <b>${target.appealNumber}</b> murojaat bilan birlashtirildi. Holatni o‘sha raqam orqali kuzatishingiz mumkin.`,
      );
    }
    return this.findOne(target.id, actor);
  }

  // ============ MUDDAT UZAYTIRISH ============

  async extendDeadline(id: string, additionalHours: number, reason: string, actor: AuthUser) {
    const appeal = await this.findOne(id, actor);
    const base = appeal.deadlineAt && appeal.deadlineAt > new Date() ? appeal.deadlineAt : new Date();
    const newDeadline = new Date(base.getTime() + additionalHours * 3600 * 1000);
    const updated = await this.prisma.appeal.update({
      where: { id },
      data: {
        deadlineAt: newDeadline,
        deadlineExtendedCount: { increment: 1 },
        reminder24Sent: false,
        reminder6Sent: false,
        // Agar OVERDUE bo'lgan bo'lsa, ishga qaytaramiz
        status: appeal.status === AppealStatus.OVERDUE ? AppealStatus.IN_PROGRESS : appeal.status,
        statusHistory: {
          create: {
            fromStatus: appeal.status,
            toStatus: appeal.status === AppealStatus.OVERDUE ? AppealStatus.IN_PROGRESS : appeal.status,
            changedById: actor.id,
            comment: `Muddat ${additionalHours} soatga uzaytirildi. Sabab: ${reason}`,
          },
        },
      },
      include: appealListInclude,
    });
    await this.audit.log({
      userId: actor.id,
      action: 'APPEAL_EXTEND_DEADLINE',
      entity: 'Appeal',
      entityId: id,
      oldValue: { deadlineAt: appeal.deadlineAt },
      newValue: { deadlineAt: newDeadline, reason, additionalHours },
    });
    if (updated.assignedToId && updated.assignedToId !== actor.id) {
      await this.notifications.notifyUser({
        userId: updated.assignedToId,
        title: 'Muddat uzaytirildi',
        message: `${updated.appealNumber}: yangi muddat ${newDeadline.toLocaleString('uz-UZ')}`,
        type: NotificationType.STATUS_CHANGED,
        meta: { appealId: id },
      });
    }
    return updated;
  }

  // ============ HAMIJROCHILAR ============

  async addCoAssignee(id: string, userId: string, actor: AuthUser) {
    const appeal = await this.findOne(id, actor);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new BadRequestException('Xodim topilmadi yoki faol emas');
    if (user.organizationId !== appeal.organizationId && actor.role !== Role.SUPER_ADMIN) {
      throw new BadRequestException('Xodim boshqa tashkilotdan');
    }
    if (userId === appeal.assignedToId) {
      throw new BadRequestException('Bu xodim allaqachon asosiy ijrochi');
    }
    await this.prisma.appealAssignee.upsert({
      where: { appealId_userId: { appealId: id, userId } },
      update: {},
      create: { appealId: id, userId, addedById: actor.id },
    });
    await this.audit.log({
      userId: actor.id,
      action: 'APPEAL_ADD_COASSIGNEE',
      entity: 'Appeal',
      entityId: id,
      newValue: { userId },
    });
    await this.notifications.notifyUser({
      userId,
      title: 'Siz hamijrochi qilib biriktirildingiz',
      message: `${appeal.appealNumber}: ${appeal.title}`,
      type: NotificationType.ASSIGNED,
      meta: { appealId: id },
    });
    return this.findOne(id, actor);
  }

  async removeCoAssignee(id: string, userId: string, actor: AuthUser) {
    await this.findOne(id, actor);
    await this.prisma.appealAssignee.deleteMany({ where: { appealId: id, userId } });
    await this.audit.log({
      userId: actor.id,
      action: 'APPEAL_REMOVE_COASSIGNEE',
      entity: 'Appeal',
      entityId: id,
      oldValue: { userId },
    });
    return this.findOne(id, actor);
  }

  // ============ SHIKOYAT / ESKALATSIYA ============

  /** Fuqaro shikoyati yoki xodim eskalatsiyasi — rahbarlarga ko'tariladi */
  async escalate(id: string, reason: string, actor: AuthUser | null, byCitizenChatId?: string) {
    const appeal = await this.prisma.appeal.findUnique({ where: { id } });
    if (!appeal) throw new NotFoundException('Murojaat topilmadi');
    if (actor) this.assertAccess(appeal, actor);
    else if (byCitizenChatId && appeal.citizenTelegramChatId !== byCitizenChatId) {
      throw new ForbiddenException('Bu murojaat sizga tegishli emas');
    }
    const updated = await this.prisma.appeal.update({
      where: { id },
      data: {
        escalatedAt: new Date(),
        escalationReason: reason,
        priority: appeal.priority === AppealPriority.URGENT ? appeal.priority : AppealPriority.HIGH,
        comments: {
          create: { userId: actor?.id, message: `⚠️ Eskalatsiya: ${reason}`, isInternal: false },
        },
      },
      include: appealListInclude,
    });
    await this.audit.log({
      userId: actor?.id,
      action: 'APPEAL_ESCALATE',
      entity: 'Appeal',
      entityId: id,
      newValue: { reason },
    });
    await this.notifications.notifyRole({
      organizationId: appeal.organizationId,
      roles: [Role.LEADER, Role.MANAGER, Role.ADMIN],
      title: '⚠️ Murojaat eskalatsiya qilindi',
      message: `${appeal.appealNumber}: ${reason}`,
      type: NotificationType.OVERDUE_ALERT,
      meta: { appealId: id },
    });
    return updated;
  }

  async escalateByNumber(appealNumber: string, reason: string, chatId?: string) {
    const appeal = await this.prisma.appeal.findUnique({ where: { appealNumber } });
    if (!appeal) throw new NotFoundException('Murojaat topilmadi');
    return this.escalate(appeal.id, reason, null, chatId);
  }

  /** AI javob loyihasini yaratish/yangilash */
  async generateResponseDraft(id: string, actor: AuthUser) {
    const appeal = await this.findOne(id, actor);
    const draft = await this.ai.generateCitizenResponse({
      title: appeal.title,
      description: appeal.description,
      status: appeal.status,
      categoryName: appeal.category?.name,
      resolution: null,
    });
    await this.prisma.appeal.update({ where: { id }, data: { aiResponseDraft: draft } });
    return { responseDraft: draft };
  }

  // ============ PUBLIC TRACKING (fuqaro/bot) ============

  async trackByNumber(appealNumber: string, citizenPhone?: string) {
    const appeal = await this.prisma.appeal.findUnique({
      where: { appealNumber },
      select: {
        appealNumber: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        deadlineAt: true,
        closedAt: true,
        citizenRating: true,
        citizenPhone: true,
        category: { select: { name: true } },
        department: { select: { name: true } },
        comments: {
          where: { isInternal: false },
          select: { message: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
    });
    if (!appeal) throw new NotFoundException('Bunday raqamli murojaat topilmadi');
    if (citizenPhone && appeal.citizenPhone !== citizenPhone) {
      throw new ForbiddenException('Telefon raqam mos kelmadi');
    }
    const { citizenPhone: _cp, ...rest } = appeal;
    return rest;
  }

  async findByTelegramChat(chatId: string) {
    return this.prisma.appeal.findMany({
      where: { citizenTelegramChatId: chatId },
      select: {
        id: true,
        appealNumber: true,
        title: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  async rateByNumber(appealNumber: string, dto: RateDto, chatId?: string) {
    const appeal = await this.prisma.appeal.findUnique({ where: { appealNumber } });
    if (!appeal) throw new NotFoundException('Murojaat topilmadi');
    if (chatId && appeal.citizenTelegramChatId && appeal.citizenTelegramChatId !== chatId) {
      throw new ForbiddenException('Bu murojaat sizga tegishli emas');
    }
    return this.rate(appeal.id, dto, null);
  }

  // ============ DEADLINE NAZORATI (cron) ============

  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkDeadlines() {
    try {
      const now = new Date();

      // 1) Muddati o'tganlar -> OVERDUE
      const overdueAppeals = await this.prisma.appeal.findMany({
        where: {
          deadlineAt: { lt: now },
          status: { in: OPEN_STATUSES.filter((s) => s !== AppealStatus.OVERDUE) },
        },
        select: {
          id: true,
          appealNumber: true,
          title: true,
          status: true,
          assignedToId: true,
          organizationId: true,
        },
        take: 200,
      });
      for (const appeal of overdueAppeals) {
        await this.setStatusInternal(
          appeal.id,
          AppealStatus.OVERDUE,
          null,
          'Ijro muddati o‘tib ketdi',
        );
        const targets = new Set<string>();
        if (appeal.assignedToId) targets.add(appeal.assignedToId);
        const managers = await this.prisma.user.findMany({
          where: {
            organizationId: appeal.organizationId,
            role: { in: [Role.MANAGER, Role.ADMIN] },
            isActive: true,
          },
          select: { id: true },
        });
        managers.forEach((m) => targets.add(m.id));
        for (const userId of targets) {
          await this.notifications.notifyUser({
            userId,
            title: '⚠️ Murojaat muddati o‘tdi',
            message: `${appeal.appealNumber}: ${appeal.title}`,
            type: NotificationType.OVERDUE_ALERT,
            meta: { appealId: appeal.id },
          });
        }
      }

      // 2) Eslatmalar: 24 soat va 6 soat qolganda
      const reminders: { hours: number; flag: 'reminder24Sent' | 'reminder6Sent' }[] = [
        { hours: 24, flag: 'reminder24Sent' },
        { hours: 6, flag: 'reminder6Sent' },
      ];
      for (const { hours, flag } of reminders) {
        const upcoming = await this.prisma.appeal.findMany({
          where: {
            deadlineAt: { gt: now, lt: new Date(now.getTime() + hours * 3600 * 1000) },
            status: { in: OPEN_STATUSES },
            assignedToId: { not: null },
            [flag]: false,
          },
          select: { id: true, appealNumber: true, title: true, assignedToId: true, deadlineAt: true },
          take: 200,
        });
        for (const appeal of upcoming) {
          await this.prisma.appeal.update({ where: { id: appeal.id }, data: { [flag]: true } });
          await this.notifications.notifyUser({
            userId: appeal.assignedToId!,
            title: `⏰ Muddat yaqinlashmoqda (${hours} soatdan kam qoldi)`,
            message: `${appeal.appealNumber}: ${appeal.title}`,
            type: NotificationType.DEADLINE_REMINDER,
            meta: { appealId: appeal.id },
          });
        }
      }
    } catch (e) {
      this.logger.warn(`Deadline tekshiruvida xato: ${(e as Error).message}`);
    }
  }
}
