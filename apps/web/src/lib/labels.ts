import {
  STATUS_LABELS_UZ,
  PRIORITY_LABELS_UZ,
  ROLE_LABELS_UZ,
  SOURCE_LABELS_UZ,
} from '@smart/shared';

export { STATUS_LABELS_UZ, PRIORITY_LABELS_UZ, ROLE_LABELS_UZ, SOURCE_LABELS_UZ };

/** Tailwind badge klasslari — statuslar */
export const STATUS_BADGE: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800 border-blue-200',
  AI_ANALYZING: 'bg-violet-100 text-violet-800 border-violet-200',
  OPERATOR_REVIEW: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  ASSIGNED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  ACCEPTED: 'bg-sky-100 text-sky-800 border-sky-200',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  WAITING_CITIZEN_INFO: 'bg-orange-100 text-orange-800 border-orange-200',
  WAITING_EVIDENCE: 'bg-orange-100 text-orange-800 border-orange-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-gray-200 text-gray-700 border-gray-300',
  REOPENED: 'bg-pink-100 text-pink-800 border-pink-200',
  OVERDUE: 'bg-red-100 text-red-800 border-red-200',
  CLOSED: 'bg-slate-200 text-slate-700 border-slate-300',
};

export const PRIORITY_BADGE: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700 border-gray-200',
  MEDIUM: 'bg-blue-100 text-blue-800 border-blue-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  URGENT: 'bg-red-100 text-red-800 border-red-200',
};

/** Xarita uchun status ranglari (hex) */
export const STATUS_HEX: Record<string, string> = {
  NEW: '#3b82f6',
  AI_ANALYZING: '#8b5cf6',
  OPERATOR_REVIEW: '#06b6d4',
  ASSIGNED: '#6366f1',
  ACCEPTED: '#0ea5e9',
  IN_PROGRESS: '#eab308',
  WAITING_CITIZEN_INFO: '#f97316',
  WAITING_EVIDENCE: '#f97316',
  COMPLETED: '#22c55e',
  REJECTED: '#6b7280',
  REOPENED: '#ec4899',
  OVERDUE: '#ef4444',
  CLOSED: '#64748b',
};

export function fmtDate(value?: string | Date | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fmtDateShort(value?: string | Date | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('uz-UZ');
}
