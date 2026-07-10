'use client';

import { useEffect, useState } from 'react';
import { Bot, Copy, HelpCircle, Target } from 'lucide-react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { api } from '@/lib/api';
import { Badge, Card, ErrorState, Skeleton } from '@/components/ui';

const SENTIMENT_LABELS: Record<string, string> = {
  neutral: 'Neytral',
  angry: 'Norozi',
  positive: 'Ijobiy',
  urgent: 'Shoshilinch',
};
const SENTIMENT_COLORS: Record<string, string> = {
  neutral: '#64748b',
  angry: '#ef4444',
  positive: '#22c55e',
  urgent: '#f97316',
};

export default function AiAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/dashboard/ai-analytics').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data)
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Bot className="text-violet-600" size={22} /> AI Analytics
          </h1>
          <p className="text-sm text-slate-500">
            AI tahlil qilgan {data.analyzedTotal} ta murojaat bo‘yicha statistika
          </p>
        </div>
        <Badge
          className={
            data.aiEnabled
              ? 'border-green-200 bg-green-50 dark:bg-green-950/40 text-green-700'
              : 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-700'
          }
        >
          {data.aiEnabled ? 'Gemini AI faol' : 'Fallback rejim (API key yo‘q)'}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Target size={21} />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {data.categoryAccuracy != null ? `${data.categoryAccuracy}%` : '—'}
            </div>
            <div className="text-xs text-slate-500">AI kategoriya aniqligi (yakuniy bilan mosligi)</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-100 text-pink-700">
            <Copy size={21} />
          </div>
          <div>
            <div className="text-2xl font-bold">{data.duplicateGroups}</div>
            <div className="text-xs text-slate-500">Takroriy murojaat guruhlari aniqlandi</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <HelpCircle size={21} />
          </div>
          <div>
            <div className="text-2xl font-bold">{data.withMissingInfo}</div>
            <div className="text-xs text-slate-500">Ma’lumot yetishmasligi aniqlangan murojaatlar</div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Fuqarolar kayfiyati (sentiment)</h3>
          {data.sentiment.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Ma’lumot yo‘q</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.sentiment.map((s: any) => ({
                    name: SENTIMENT_LABELS[s.name] ?? s.name,
                    value: s.count,
                    key: s.name,
                  }))}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {data.sentiment.map((s: any, i: number) => (
                    <Cell key={i} fill={SENTIMENT_COLORS[s.name] ?? '#8b5cf6'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Eng ko‘p uchraydigan kalit so‘zlar</h3>
          {data.topKeywords.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Ma’lumot yo‘q</p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-2">
              {data.topKeywords.map((k: any, i: number) => (
                <span
                  key={k.keyword}
                  className="rounded-full bg-violet-50 dark:bg-violet-950/40 px-3 py-1 text-violet-800 dark:text-violet-300"
                  style={{ fontSize: `${Math.max(12, 22 - i * 1.2)}px` }}
                >
                  {k.keyword} <span className="text-xs opacity-60">×{k.count}</span>
                </span>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="border-violet-200 dark:border-violet-900 bg-violet-50/50 dark:bg-violet-950/30 p-5 text-sm text-slate-600 dark:text-slate-300">
        <p>
          💡 <b>AI qanday ishlaydi:</b> har bir murojaat Gemini AI orqali tahlil qilinadi —
          kategoriya, ustuvorlik, mas’ul bo‘lim tavsiyasi, qisqa mazmun, kayfiyat va javob
          loyihasi avtomatik tayyorlanadi. API kaliti bo‘lmasa, kalit so‘zlarga asoslangan
          zaxira tasniflagich ishlaydi — tizim hech qachon to‘xtamaydi.
        </p>
      </Card>
    </div>
  );
}
