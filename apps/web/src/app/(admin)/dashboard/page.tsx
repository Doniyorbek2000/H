'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  Siren,
  Star,
  TrendingUp,
  Bot,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '@/lib/api';
import { STATUS_LABELS_UZ, STATUS_BADGE, STATUS_HEX, fmtDate } from '@/lib/labels';
import { Badge, Card, ErrorState, Skeleton } from '@/components/ui';

const CHART_COLORS = ['#2563eb', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#64748b'];

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  href,
}: {
  title: string;
  value: number | string;
  icon: any;
  color: string;
  href?: string;
}) {
  const body = (
    <Card className="flex items-center gap-4 p-4 transition-shadow hover:shadow-md">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
        <Icon size={21} />
      </div>
      <div>
        <div className="text-2xl font-bold leading-tight">{value}</div>
        <div className="text-xs text-slate-500">{title}</div>
      </div>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [byCategory, setByCategory] = useState<any[]>([]);
  const [byStatus, setByStatus] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [overdue, setOverdue] = useState<any[]>([]);
  const [byMahalla, setByMahalla] = useState<any[]>([]);
  const [aiQueue, setAiQueue] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api('/dashboard/overview'),
      api('/dashboard/by-category'),
      api('/dashboard/stats'),
      api('/dashboard/trends?days=30'),
      api('/dashboard/overdue'),
      api('/dashboard/by-mahalla'),
      api('/appeals?status=OPERATOR_REVIEW&limit=5&sortBy=priority&sortOrder=desc').catch(() => ({ data: [] })),
    ])
      .then(([ov, cat, st, tr, od, mh, aiq]) => {
        setOverview(ov);
        setByCategory(cat.slice(0, 8));
        setByStatus(st);
        setTrends(tr);
        setOverdue(od.slice(0, 6));
        setByMahalla(mh.slice(0, 6));
        setAiQueue(aiq.data ?? []);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!overview)
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Boshqaruv paneli</h1>
        <p className="text-sm text-slate-500">Murojaatlar bo‘yicha umumiy holat</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Jami murojaatlar" value={overview.total} icon={Inbox} color="bg-blue-100 text-blue-700" href="/appeals" />
        <StatCard title="Bugungi murojaatlar" value={overview.today} icon={TrendingUp} color="bg-cyan-100 text-cyan-700" />
        <StatCard title="Jarayonda" value={overview.inProgress} icon={Clock} color="bg-yellow-100 text-yellow-700" href="/appeals?status=IN_PROGRESS" />
        <StatCard title="Bajarilgan" value={overview.completed} icon={CheckCircle2} color="bg-green-100 text-green-700" href="/appeals?status=COMPLETED" />
        <StatCard title="Kechikayotgan" value={overview.overdue} icon={AlertTriangle} color="bg-red-100 text-red-700 dark:text-red-300" href="/appeals?overdue=true" />
        <StatCard title="Shoshilinch" value={overview.urgent} icon={Siren} color="bg-rose-100 text-rose-700" href="/appeals?priority=URGENT" />
        <StatCard title="Operator ko‘rigida" value={overview.operatorReview} icon={Bot} color="bg-violet-100 text-violet-700" href="/appeals?status=OPERATOR_REVIEW" />
        <StatCard title="O‘rtacha baho" value={overview.avgRating ?? '—'} icon={Star} color="bg-amber-100 text-amber-700" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">30 kunlik trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="created" name="Kelib tushgan" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="completed" name="Bajarilgan" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Kategoriyalar kesimida</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byCategory} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Bar dataKey="count" name="Murojaatlar" radius={[0, 4, 4, 0]}>
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Holatlar taqsimoti</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={byStatus.map((s) => ({
                  name: (STATUS_LABELS_UZ as any)[s.status] ?? s.status,
                  value: s.count,
                  status: s.status,
                }))}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {byStatus.map((s, i) => (
                  <Cell key={i} fill={STATUS_HEX[s.status] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Eng ko‘p muammoli mahallalar</h3>
          {byMahalla.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Ma’lumot yo‘q</p>
          ) : (
            <div className="space-y-2.5">
              {byMahalla.map((m, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-40 truncate text-sm">{m.mahalla}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-primary-500"
                      style={{ width: `${(m.count / byMahalla[0].count) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-semibold">{m.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="border-violet-200 dark:border-violet-900">
        <div className="flex items-center justify-between border-b border-violet-100 dark:border-violet-900/60 bg-violet-50/50 dark:bg-violet-950/30 px-4 py-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-violet-900 dark:text-violet-200">
            <Bot size={16} /> AI tavsiyalari — operator ko‘rigini kutmoqda
          </h3>
          <Link
            href="/appeals?status=OPERATOR_REVIEW"
            className="text-xs text-violet-700 hover:underline"
          >
            Hammasini ko‘rish →
          </Link>
        </div>
        {aiQueue.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">
            AI ko‘rigini kutayotgan murojaatlar yo‘q ✅
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {aiQueue.map((a) => (
              <Link
                key={a.id}
                href={`/appeals/${a.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-violet-50/40 dark:hover:bg-violet-950/30"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    <span className="font-mono text-xs text-slate-400">{a.appealNumber}</span>{' '}
                    {a.title}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    AI: {a.aiCategorySuggestion ?? 'tahlil kutilmoqda'}
                    {a.aiDepartmentSuggestion ? ` → ${a.aiDepartmentSuggestion}` : ''}
                  </div>
                </div>
                <Badge
                  className={
                    a.aiPrioritySuggestion === 'URGENT' || a.priority === 'URGENT'
                      ? 'border-red-200 dark:border-red-900 bg-red-100 text-red-800'
                      : 'border-violet-200 dark:border-violet-900 bg-violet-50 text-violet-700'
                  }
                >
                  {a.aiPrioritySuggestion ?? a.priority}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4 py-3">
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">⚠️ Kechikayotgan murojaatlar</h3>
          <Link href="/appeals?overdue=true" className="text-xs text-primary-600 hover:underline">
            Hammasini ko‘rish →
          </Link>
        </div>
        {overdue.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">Kechikayotgan murojaatlar yo‘q 🎉</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {overdue.map((a) => (
              <Link
                key={a.id}
                href={`/appeals/${a.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    <span className="font-mono text-xs text-slate-400">{a.appealNumber}</span>{' '}
                    {a.title}
                  </div>
                  <div className="text-xs text-slate-500">
                    {a.assignedTo?.fullName ?? 'Biriktirilmagan'} · muddat: {fmtDate(a.deadlineAt)}
                  </div>
                </div>
                <Badge className={STATUS_BADGE[a.status]}>
                  {(STATUS_LABELS_UZ as any)[a.status]}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
