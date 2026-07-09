'use client';

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge, Card, EmptyState, ErrorState, TableSkeleton } from '@/components/ui';

function scoreColor(score: number) {
  if (score >= 70) return 'border-green-200 bg-green-50 text-green-700';
  if (score >= 40) return 'border-yellow-200 bg-yellow-50 text-yellow-700';
  return 'border-red-200 bg-red-50 text-red-700';
}

export default function KpiPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/dashboard/kpi').then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">KPI va reyting</h1>
        <p className="text-sm text-slate-500">Bo‘limlar reytingi va xodimlar samaradorligi</p>
      </div>

      {error && <ErrorState message={error} />}
      {!data && !error && <TableSkeleton rows={6} />}

      {data && (
        <>
          <Card>
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold">🏢 Bo‘limlar reytingi</h3>
            </div>
            {data.departments.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Bo‘lim</th>
                      <th className="px-4 py-3">Murojaatlar</th>
                      <th className="px-4 py-3">Bajarilgan</th>
                      <th className="px-4 py-3">Bajarilish %</th>
                      <th className="px-4 py-3">O‘rtacha vaqt</th>
                      <th className="px-4 py-3">Kechikkan</th>
                      <th className="px-4 py-3">Baho</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.departments.map((d: any, i: number) => (
                      <tr key={d.departmentId} className="border-b border-slate-100">
                        <td className="px-4 py-3">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                        <td className="px-4 py-3 font-medium">{d.departmentName}</td>
                        <td className="px-4 py-3">{d.total}</td>
                        <td className="px-4 py-3">{d.completed}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-primary-500" style={{ width: `${d.completionRate}%` }} />
                            </div>
                            <span className="text-xs font-medium">{d.completionRate}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">{d.avgCompletionHours ? `${d.avgCompletionHours} soat` : '—'}</td>
                        <td className="px-4 py-3">
                          {d.overdue > 0 ? <span className="font-medium text-red-600">{d.overdue}</span> : 0}
                        </td>
                        <td className="px-4 py-3">{d.rating ? `⭐ ${d.rating}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              <Trophy size={16} className="text-amber-500" />
              <h3 className="text-sm font-semibold">Xodimlar samaradorligi</h3>
            </div>
            {data.users.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Xodim</th>
                      <th className="px-4 py-3">Jami</th>
                      <th className="px-4 py-3">Bajarilgan</th>
                      <th className="px-4 py-3">O‘z vaqtida</th>
                      <th className="px-4 py-3">Kechikkan</th>
                      <th className="px-4 py-3">Qayta ochilgan</th>
                      <th className="px-4 py-3">O‘rtacha vaqt</th>
                      <th className="px-4 py-3">Baho</th>
                      <th className="px-4 py-3">Samaradorlik</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u: any, i: number) => (
                      <tr key={u.userId} className="border-b border-slate-100">
                        <td className="px-4 py-3">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{u.fullName}</div>
                          <div className="text-xs text-slate-400">{u.departmentName ?? '—'}</div>
                        </td>
                        <td className="px-4 py-3">{u.total}</td>
                        <td className="px-4 py-3">{u.completed}</td>
                        <td className="px-4 py-3">{u.onTime}</td>
                        <td className="px-4 py-3">{u.overdue > 0 ? <span className="text-red-600">{u.overdue}</span> : 0}</td>
                        <td className="px-4 py-3">{u.reopened}</td>
                        <td className="px-4 py-3">{u.avgCompletionHours ? `${u.avgCompletionHours} soat` : '—'}</td>
                        <td className="px-4 py-3">{u.avgRating ? `⭐ ${u.avgRating}` : '—'}</td>
                        <td className="px-4 py-3">
                          <Badge className={scoreColor(u.efficiencyScore)}>{u.efficiencyScore} ball</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
