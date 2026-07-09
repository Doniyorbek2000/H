import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReportType, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto, paginate } from '../../common/dto/pagination.dto';
import { renderReportPdf } from './pdf.util';
import { renderReportExcel } from './excel.util';

const PERIOD_LABELS: Record<ReportType, string> = {
  DAILY: 'kunlik',
  WEEKLY: 'haftalik',
  MONTHLY: 'oylik',
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly audit: AuditService,
    private readonly dashboard: DashboardService,
  ) {}

  private periodRange(type: ReportType): { from: Date; to: Date } {
    const to = new Date();
    const from = new Date();
    if (type === ReportType.DAILY) from.setDate(from.getDate() - 1);
    if (type === ReportType.WEEKLY) from.setDate(from.getDate() - 7);
    if (type === ReportType.MONTHLY) from.setMonth(from.getMonth() - 1);
    return { from, to };
  }

  async generate(type: ReportType, actor: AuthUser, organizationId?: string) {
    const orgId =
      actor.role === Role.SUPER_ADMIN ? (organizationId ?? actor.organizationId) : actor.organizationId;
    if (!orgId) throw new BadRequestException('Tashkilot aniqlanmadi');
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Tashkilot topilmadi');

    const { from, to } = this.periodRange(type);
    const stats = await this.dashboard.fullStats(orgId, from, to);
    const aiSummary = await this.ai.generateLeaderReport(stats, PERIOD_LABELS[type]);

    const title = `${org.name} — ${PERIOD_LABELS[type]} hisobot (${to.toLocaleDateString('uz-UZ')})`;
    const report = await this.prisma.report.create({
      data: {
        organizationId: orgId,
        type,
        title,
        content: { ...stats, period: { from: from.toISOString(), to: to.toISOString() } } as Prisma.InputJsonValue,
        aiSummary,
        createdById: actor.id,
      },
      include: { organization: { select: { name: true } } },
    });
    await this.audit.log({
      userId: actor.id,
      action: 'REPORT_GENERATE',
      entity: 'Report',
      entityId: report.id,
      newValue: { type, title },
    });
    return report;
  }

  async findAll(query: PaginationQueryDto & { type?: ReportType }, actor: AuthUser) {
    const where: Prisma.ReportWhereInput = {};
    if (actor.role !== Role.SUPER_ADMIN) where.organizationId = actor.organizationId ?? '__none__';
    if (query.type) where.type = query.type;
    if (query.search) where.title = { contains: query.search, mode: 'insensitive' };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        include: {
          organization: { select: { name: true } },
          createdBy: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.report.count({ where }),
    ]);
    return paginate(data, total, query.page, query.limit);
  }

  async findOne(id: string, actor: AuthUser) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: { organization: { select: { id: true, name: true } } },
    });
    if (!report) throw new NotFoundException('Hisobot topilmadi');
    if (actor.role !== Role.SUPER_ADMIN && report.organizationId !== actor.organizationId) {
      throw new NotFoundException('Hisobot topilmadi');
    }
    return report;
  }

  async downloadPdf(id: string, actor: AuthUser): Promise<{ buffer: Buffer; fileName: string }> {
    const report = await this.findOne(id, actor);
    const buffer = await renderReportPdf(report);
    return { buffer, fileName: `hisobot-${report.type.toLowerCase()}-${id.slice(0, 8)}.pdf` };
  }

  async downloadExcel(id: string, actor: AuthUser): Promise<{ buffer: Buffer; fileName: string }> {
    const report = await this.findOne(id, actor);
    const buffer = await renderReportExcel(report);
    return { buffer, fileName: `hisobot-${report.type.toLowerCase()}-${id.slice(0, 8)}.xlsx` };
  }
}
