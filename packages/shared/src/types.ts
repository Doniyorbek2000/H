/** Gemini murojaat tahlili natijasi */
export interface AiAnalysisResult {
  summary: string;
  category: string;
  /** String union — Prisma va shared enumlari bilan mos */
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  departmentSuggestion: string;
  deadlineHours: number;
  sentiment: 'neutral' | 'angry' | 'positive' | 'urgent';
  missingInfo: string[];
  responseDraft: string;
  keywords: string[];
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface KpiUserRow {
  userId: string;
  fullName: string;
  departmentName: string | null;
  total: number;
  completed: number;
  overdue: number;
  reopened: number;
  avgCompletionHours: number | null;
  avgRating: number | null;
  onTime: number;
  efficiencyScore: number;
}

export interface KpiDepartmentRow {
  departmentId: string;
  departmentName: string;
  total: number;
  completed: number;
  completionRate: number;
  avgCompletionHours: number | null;
  overdue: number;
  rating: number;
}

export interface DashboardOverview {
  total: number;
  today: number;
  inProgress: number;
  completed: number;
  overdue: number;
  urgent: number;
  operatorReview: number;
  avgRating: number | null;
}
