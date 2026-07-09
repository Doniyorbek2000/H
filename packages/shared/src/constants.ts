import { AppealPriority, AppealSource, AppealStatus, NotificationType, Role } from './enums';

/** O'zbekcha status nomlari */
export const STATUS_LABELS_UZ: Record<AppealStatus, string> = {
  [AppealStatus.NEW]: 'Yangi murojaat',
  [AppealStatus.AI_ANALYZING]: 'AI tahlil qilmoqda',
  [AppealStatus.OPERATOR_REVIEW]: 'Operator ko‘rigida',
  [AppealStatus.ASSIGNED]: 'Biriktirildi',
  [AppealStatus.ACCEPTED]: 'Qabul qilindi',
  [AppealStatus.IN_PROGRESS]: 'Jarayonda',
  [AppealStatus.WAITING_CITIZEN_INFO]: 'Fuqarodan ma’lumot kutilmoqda',
  [AppealStatus.WAITING_EVIDENCE]: 'Dalil kutilmoqda',
  [AppealStatus.COMPLETED]: 'Bajarildi',
  [AppealStatus.REJECTED]: 'Rad etildi',
  [AppealStatus.REOPENED]: 'Qayta ochildi',
  [AppealStatus.OVERDUE]: 'Kechikmoqda',
  [AppealStatus.CLOSED]: 'Yopildi',
};

export const PRIORITY_LABELS_UZ: Record<AppealPriority, string> = {
  [AppealPriority.LOW]: 'Past',
  [AppealPriority.MEDIUM]: 'O‘rta',
  [AppealPriority.HIGH]: 'Yuqori',
  [AppealPriority.URGENT]: 'Shoshilinch',
};

export const SOURCE_LABELS_UZ: Record<AppealSource, string> = {
  [AppealSource.WEB]: 'Veb portal',
  [AppealSource.TELEGRAM]: 'Telegram',
  [AppealSource.MOBILE]: 'Mobil ilova',
  [AppealSource.OPERATOR]: 'Operator',
  [AppealSource.QR]: 'QR kod',
};

export const ROLE_LABELS_UZ: Record<Role, string> = {
  [Role.SUPER_ADMIN]: 'Super administrator',
  [Role.ADMIN]: 'Administrator',
  [Role.OPERATOR]: 'Operator',
  [Role.EXECUTOR]: 'Mas’ul xodim',
  [Role.MANAGER]: 'Bo‘lim rahbari',
  [Role.LEADER]: 'Rahbar',
  [Role.CITIZEN]: 'Fuqaro',
};

export const NOTIFICATION_LABELS_UZ: Record<NotificationType, string> = {
  [NotificationType.APPEAL_CREATED]: 'Yangi murojaat',
  [NotificationType.AI_READY]: 'AI tahlil tayyor',
  [NotificationType.ASSIGNED]: 'Vazifa biriktirildi',
  [NotificationType.STATUS_CHANGED]: 'Holat o‘zgardi',
  [NotificationType.DEADLINE_REMINDER]: 'Muddat eslatmasi',
  [NotificationType.OVERDUE_ALERT]: 'Muddat o‘tdi',
  [NotificationType.COMMENT]: 'Yangi izoh',
  [NotificationType.SYSTEM]: 'Tizim xabari',
};

/** Dashboard/status ranglari (tailwind class nomlarisiz, semantik) */
export const STATUS_COLORS: Record<AppealStatus, string> = {
  [AppealStatus.NEW]: 'blue',
  [AppealStatus.AI_ANALYZING]: 'violet',
  [AppealStatus.OPERATOR_REVIEW]: 'cyan',
  [AppealStatus.ASSIGNED]: 'indigo',
  [AppealStatus.ACCEPTED]: 'sky',
  [AppealStatus.IN_PROGRESS]: 'yellow',
  [AppealStatus.WAITING_CITIZEN_INFO]: 'orange',
  [AppealStatus.WAITING_EVIDENCE]: 'orange',
  [AppealStatus.COMPLETED]: 'green',
  [AppealStatus.REJECTED]: 'gray',
  [AppealStatus.REOPENED]: 'pink',
  [AppealStatus.OVERDUE]: 'red',
  [AppealStatus.CLOSED]: 'slate',
};

export const PRIORITY_COLORS: Record<AppealPriority, string> = {
  [AppealPriority.LOW]: 'gray',
  [AppealPriority.MEDIUM]: 'blue',
  [AppealPriority.HIGH]: 'orange',
  [AppealPriority.URGENT]: 'red',
};

/** Yakuniy (statistikada "ochiq" hisoblanmaydigan) statuslar */
export const TERMINAL_STATUSES: AppealStatus[] = [
  AppealStatus.COMPLETED,
  AppealStatus.REJECTED,
  AppealStatus.CLOSED,
];

export const DEFAULT_DEADLINE_HOURS = 72;

export const DEFAULT_CATEGORIES: { name: string; description: string; defaultDeadlineHours: number }[] = [
  { name: 'Yo‘l', description: 'Yo‘l va transport infratuzilmasi', defaultDeadlineHours: 120 },
  { name: 'Suv', description: 'Ichimlik suvi va kanalizatsiya', defaultDeadlineHours: 48 },
  { name: 'Gaz', description: 'Tabiiy gaz ta’minoti', defaultDeadlineHours: 48 },
  { name: 'Elektr', description: 'Elektr energiyasi ta’minoti', defaultDeadlineHours: 24 },
  { name: 'Chiqindi', description: 'Chiqindilarni olib chiqish va tozalik', defaultDeadlineHours: 48 },
  { name: 'Qurilish', description: 'Qurilish va obodonlashtirish', defaultDeadlineHours: 168 },
  { name: 'Bandlik', description: 'Ish bilan ta’minlash masalalari', defaultDeadlineHours: 120 },
  { name: 'Tadbirkorlik', description: 'Tadbirkorlikni qo‘llab-quvvatlash', defaultDeadlineHours: 120 },
  { name: 'Ijtimoiy yordam', description: 'Ijtimoiy himoya va yordam', defaultDeadlineHours: 72 },
  { name: 'Ta’lim', description: 'Maktab va bog‘chalar masalalari', defaultDeadlineHours: 120 },
  { name: 'Sog‘liqni saqlash', description: 'Tibbiy xizmatlar', defaultDeadlineHours: 72 },
  { name: 'Boshqa', description: 'Boshqa turdagi murojaatlar', defaultDeadlineHours: 72 },
];
