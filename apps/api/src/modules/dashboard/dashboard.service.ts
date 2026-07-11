import { Injectable } from '@nestjs/common';
import { AppealPriority, AppealStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

const DONE_STATUSES: AppealStatus[] = [AppealStatus.COMPLETED, AppealStatus.CLOSED];

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

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private orgScope(actor: AuthUser): Prisma.AppealWhereInput {
    if (actor.role === Role.SUPER_ADMIN) return {};
    return { organizationId: actor.organizationId ?? '__none__' };
  }

  async overview(actor: AuthUser) {
    const scope = this.orgScope(actor);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const [total, today, inProgress, completed, overdue, urgent, operatorReview, ratingAgg] =
      await this.prisma.$transaction([
        this.prisma.appeal.count({ where: scope }),
        this.prisma.appeal.count({ where: { ...scope, createdAt: { gte: startOfToday } } }),
        this.prisma.appeal.count({
          where: { ...scope, status: { in: [AppealStatus.IN_PROGRESS, AppealStatus.ACCEPTED, AppealStatus.ASSIGNED] } },
        }),
        this.prisma.appeal.count({
          where: { ...scope, status: { in: [AppealStatus.COMPLETED, AppealStatus.CLOSED] } },
        }),
        this.prisma.appeal.count({ where: { ...scope, status: AppealStatus.OVERDUE } }),
        this.prisma.appeal.count({
          where: { ...scope, priority: AppealPriority.URGENT, status: { in: OPEN_STATUSES } },
        }),
        this.prisma.appeal.count({ where: { ...scope, status: AppealStatus.OPERATOR_REVIEW } }),
        this.prisma.appeal.aggregate({
          where: { ...scope, citizenRating: { not: null } },
          _avg: { citizenRating: true },
        }),
      ]);
    return {
      total,
      today,
      inProgress,
      completed,
      overdue,
      urgent,
      operatorReview,
      avgRating: ratingAgg._avg.citizenRating
        ? Math.round(ratingAgg._avg.citizenRating * 100) / 100
        : null,
    };
  }

  async statusStats(actor: AuthUser) {
    const scope = this.orgScope(actor);
    const groups = await this.prisma.appeal.groupBy({
      by: ['status'],
      where: scope,
      _count: { _all: true },
    });
    return groups.map((g) => ({ status: g.status, count: g._count._all }));
  }

  async byCategory(actor: AuthUser) {
    const scope = this.orgScope(actor);
    const groups = await this.prisma.appeal.groupBy({
      by: ['categoryId'],
      where: scope,
      _count: { _all: true },
    });
    const categories = await this.prisma.category.findMany({
      where: { id: { in: groups.map((g) => g.categoryId).filter(Boolean) as string[] } },
      select: { id: true, name: true },
    });
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return groups
      .map((g) => ({
        categoryId: g.categoryId,
        name: g.categoryId ? (map.get(g.categoryId) ?? 'Noma’lum') : 'Kategoriyasiz',
        count: g._count._all,
      }))
      .sort((a, b) => b.count - a.count);
  }

  async byMahalla(actor: AuthUser) {
    const scope = this.orgScope(actor);
    const groups = await this.prisma.appeal.groupBy({
      by: ['mahalla'],
      where: { ...scope, mahalla: { not: null } },
      _count: { _all: true },
    });
    return groups
      .map((g) => ({ mahalla: g.mahalla, count: g._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  async overdueList(actor: AuthUser) {
    const scope = this.orgScope(actor);
    return this.prisma.appeal.findMany({
      where: {
        ...scope,
        OR: [
          { status: AppealStatus.OVERDUE },
          { deadlineAt: { lt: new Date() }, status: { in: OPEN_STATUSES } },
        ],
      },
      include: {
        category: { select: { name: true } },
        department: { select: { name: true } },
        assignedTo: { select: { id: true, fullName: true } },
      },
      orderBy: { deadlineAt: 'asc' },
      take: 50,
    });
  }

  /** Haftalik/oylik trend: kunlik yaratilgan va yakunlangan soni */
  async trends(actor: AuthUser, days = 30) {
    const scope = this.orgScope(actor);
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);
    const appeals = await this.prisma.appeal.findMany({
      where: { ...scope, createdAt: { gte: since } },
      select: { createdAt: true, completedAt: true, closedAt: true },
    });
    const byDay = new Map<string, { created: number; completed: number }>();
    for (let i = 0; i <= days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      byDay.set(d.toISOString().slice(0, 10), { created: 0, completed: 0 });
    }
    for (const a of appeals) {
      const ck = a.createdAt.toISOString().slice(0, 10);
      if (byDay.has(ck)) byDay.get(ck)!.created++;
      const doneAt = a.completedAt ?? a.closedAt;
      if (doneAt) {
        const dk = doneAt.toISOString().slice(0, 10);
        if (byDay.has(dk)) byDay.get(dk)!.completed++;
      }
    }
    return Array.from(byDay.entries()).map(([date, v]) => ({ date, ...v }));
  }

  /**
   * Xodimlar va bo'limlar KPI.
   * Optimallashtirilgan: har bir xodim/bo'lim uchun alohida so'rov (N+1) o'rniga
   * barcha murojaatlar BITTA so'rovda olinadi va xotirada guruhlanadi.
   */
  async kpi(actor: AuthUser) {
    const scope = this.orgScope(actor);
    const now = new Date();

    const [executors, departments, appeals] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          role: { in: [Role.EXECUTOR, Role.MANAGER] },
          isActive: true,
          ...(actor.role === Role.SUPER_ADMIN
            ? {}
            : { organizationId: actor.organizationId ?? '__none__' }),
        },
        select: { id: true, fullName: true, department: { select: { name: true } } },
      }),
      this.prisma.department.findMany({
        where:
          actor.role === Role.SUPER_ADMIN
            ? { isActive: true }
            : { organizationId: actor.organizationId ?? '__none__', isActive: true },
        select: { id: true, name: true },
      }),
      this.prisma.appeal.findMany({
        where: { ...scope, OR: [{ assignedToId: { not: null } }, { departmentId: { not: null } }] },
        select: {
          assignedToId: true,
          departmentId: true,
          status: true,
          createdAt: true,
          completedAt: true,
          deadlineAt: true,
          citizenRating: true,
          statusHistory: { where: { toStatus: AppealStatus.REOPENED }, select: { id: true }, take: 1 },
        },
      }),
    ]);

    type A = (typeof appeals)[number];
    const metrics = (list: A[]) => {
      const total = list.length;
      const completedList = list.filter((a) => DONE_STATUSES.includes(a.status));
      const completed = completedList.length;
      const durations = completedList
        .filter((a) => a.completedAt)
        .map((a) => (a.completedAt!.getTime() - a.createdAt.getTime()) / 3600000);
      const avgCompletionHours = durations.length
        ? Math.round((durations.reduce((s, d) => s + d, 0) / durations.length) * 10) / 10
        : null;
      const ratings = list.filter((a) => a.citizenRating != null).map((a) => a.citizenRating!);
      const avgRating = ratings.length
        ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 100) / 100
        : null;
      const onTime = completedList.filter(
        (a) => !a.deadlineAt || (a.completedAt && a.completedAt <= a.deadlineAt),
      ).length;
      return { total, completed, completedList, avgCompletionHours, avgRating, onTime };
    };

    // Xodimlar bo'yicha guruhlash (1 marta aylanish)
    const byUser = new Map<string, A[]>();
    const byDep = new Map<string, A[]>();
    for (const a of appeals) {
      if (a.assignedToId) (byUser.get(a.assignedToId) ?? byUser.set(a.assignedToId, []).get(a.assignedToId)!).push(a);
      if (a.departmentId) (byDep.get(a.departmentId) ?? byDep.set(a.departmentId, []).get(a.departmentId)!).push(a);
    }

    const users = executors.map((ex) => {
      const list = byUser.get(ex.id) ?? [];
      const m = metrics(list);
      const overdue = list.filter((a) => a.status === AppealStatus.OVERDUE).length;
      const reopened = list.filter((a) => a.statusHistory.length > 0).length;
      const efficiencyScore =
        m.total === 0
          ? 0
          : Math.round(
              ((m.completed / m.total) * 40 +
                (m.completed > 0 ? (m.onTime / m.completed) * 30 : 0) +
                ((m.avgRating ?? 0) / 5) * 20 -
                (reopened / m.total) * 10) *
                10,
            ) / 10;
      return {
        userId: ex.id,
        fullName: ex.fullName,
        departmentName: ex.department?.name ?? null,
        total: m.total,
        completed: m.completed,
        overdue,
        reopened,
        onTime: m.onTime,
        avgCompletionHours: m.avgCompletionHours,
        avgRating: m.avgRating,
        efficiencyScore,
      };
    });
    users.sort((a, b) => b.efficiencyScore - a.efficiencyScore);

    const deps = departments.map((dep) => {
      const list = byDep.get(dep.id) ?? [];
      const m = metrics(list);
      const overdue = list.filter(
        (a) =>
          a.status === AppealStatus.OVERDUE ||
          (a.deadlineAt && a.deadlineAt < now && !a.completedAt),
      ).length;
      return {
        departmentId: dep.id,
        departmentName: dep.name,
        total: m.total,
        completed: m.completed,
        completionRate: m.total ? Math.round((m.completed / m.total) * 1000) / 10 : 0,
        avgCompletionHours: m.avgCompletionHours,
        overdue,
        rating: m.avgRating ?? 0,
      };
    });
    deps.sort((a, b) => b.completionRate - a.completionRate);

    return { users, departments: deps };
  }

  /** AI Analytics: sentiment, kalit so'zlar, AI aniqlik, dublikatlar */
  async aiAnalytics(actor: AuthUser) {
    const scope = this.orgScope(actor);
    const appeals = await this.prisma.appeal.findMany({
      where: { ...scope, aiSummary: { not: null } },
      select: {
        aiSentiment: true,
        aiKeywords: true,
        aiCategorySuggestion: true,
        aiMissingInfo: true,
        duplicateGroupId: true,
        category: { select: { name: true } },
      },
      take: 2000,
      orderBy: { createdAt: 'desc' },
    });

    const sentiment = new Map<string, number>();
    const keywords = new Map<string, number>();
    let categoryMatch = 0;
    let categoryTotal = 0;
    let withMissingInfo = 0;
    const duplicateGroups = new Set<string>();

    for (const a of appeals) {
      const s = a.aiSentiment ?? 'neutral';
      sentiment.set(s, (sentiment.get(s) ?? 0) + 1);
      for (const k of a.aiKeywords ?? []) {
        const key = k.toLowerCase().trim();
        if (key.length > 2) keywords.set(key, (keywords.get(key) ?? 0) + 1);
      }
      if (a.aiCategorySuggestion && a.category?.name) {
        categoryTotal++;
        if (a.aiCategorySuggestion.toLowerCase() === a.category.name.toLowerCase()) categoryMatch++;
      }
      if ((a.aiMissingInfo ?? []).length > 0) withMissingInfo++;
      if (a.duplicateGroupId) duplicateGroups.add(a.duplicateGroupId);
    }

    return {
      analyzedTotal: appeals.length,
      sentiment: Array.from(sentiment.entries()).map(([name, count]) => ({ name, count })),
      topKeywords: Array.from(keywords.entries())
        .map(([keyword, count]) => ({ keyword, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15),
      categoryAccuracy: categoryTotal
        ? Math.round((categoryMatch / categoryTotal) * 1000) / 10
        : null,
      withMissingInfo,
      duplicateGroups: duplicateGroups.size,
      aiEnabled: Boolean(process.env.GEMINI_API_KEY),
    };
  }

  /** Xaritada ko'rsatish uchun koordinatali murojaatlar */
  async mapData(actor: AuthUser) {
    const scope = this.orgScope(actor);
    return this.prisma.appeal.findMany({
      where: { ...scope, latitude: { not: null }, longitude: { not: null } },
      select: {
        id: true,
        appealNumber: true,
        title: true,
        status: true,
        priority: true,
        latitude: true,
        longitude: true,
        mahalla: true,
        category: { select: { name: true } },
      },
      take: 500,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Hisobot uchun to'liq statistika to'plami */
  async fullStats(organizationId: string, from: Date, to: Date) {
    const scope: Prisma.AppealWhereInput = {
      organizationId,
      createdAt: { gte: from, lt: to },
    };
    const [total, completed, rejected, overdue, ratingAgg] = await this.prisma.$transaction([
      this.prisma.appeal.count({ where: scope }),
      this.prisma.appeal.count({ where: { ...scope, status: { in: DONE_STATUSES } } }),
      this.prisma.appeal.count({ where: { ...scope, status: AppealStatus.REJECTED } }),
      this.prisma.appeal.count({ where: { ...scope, status: AppealStatus.OVERDUE } }),
      this.prisma.appeal.aggregate({
        where: { ...scope, citizenRating: { not: null } },
        _avg: { citizenRating: true },
      }),
    ]);
    const byStatus = await this.prisma.appeal.groupBy({
      by: ['status'],
      where: scope,
      _count: { _all: true },
    });
    const byCategoryRaw = await this.prisma.appeal.groupBy({
      by: ['categoryId'],
      where: scope,
      _count: { _all: true },
    });
    const byMahalla = await this.prisma.appeal.groupBy({
      by: ['mahalla'],
      where: { ...scope, mahalla: { not: null } },
      _count: { _all: true },
    });
    const catIds = byCategoryRaw.map((g) => g.categoryId).filter(Boolean) as string[];
    const cats = await this.prisma.category.findMany({
      where: { id: { in: catIds } },
      select: { id: true, name: true },
    });
    const catMap = new Map(cats.map((c) => [c.id, c.name]));
    const topCategories = byCategoryRaw
      .map((g) => ({
        name: g.categoryId ? (catMap.get(g.categoryId) ?? 'Noma’lum') : 'Kategoriyasiz',
        count: g._count._all,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return {
      total,
      completed,
      rejected,
      overdue,
      completionRate: total ? Math.round((completed / total) * 1000) / 10 : 0,
      avgRating: ratingAgg._avg.citizenRating,
      byStatus: byStatus.map((g) => ({ status: g.status, count: g._count._all })),
      topCategories,
      topMahallas: byMahalla
        .map((g) => ({ mahalla: g.mahalla, count: g._count._all }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  }
}
