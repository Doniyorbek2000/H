'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/labels';
import {
  Badge, Card, EmptyState, ErrorState, Input, Pagination, TableSkeleton,
} from '@/components/ui';

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'border-blue-200 bg-blue-50 text-blue-700',
  APPEAL_CREATE: 'border-green-200 bg-green-50 text-green-700',
  APPEAL_STATUS_CHANGE: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  APPEAL_ASSIGN: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  APPEAL_REJECT: 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300',
};

export default function AuditPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '25' });
    if (q) params.set('search', q);
    api(`/audit-logs?${params}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, q]);

  useEffect(load, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Audit jurnal</h1>
        <p className="text-sm text-slate-500">Tizimdagi barcha amallar tarixi</p>
      </div>

      <Card className="p-4">
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Amal yoki obyekt bo‘yicha qidiruv..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
      </Card>

      <Card>
        {error && <ErrorState message={error} />}
        {loading && <TableSkeleton rows={10} />}
        {!loading && data?.data.length === 0 && <EmptyState />}
        {!loading && data?.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-3">Vaqt</th>
                  <th className="px-4 py-3">Foydalanuvchi</th>
                  <th className="px-4 py-3">Amal</th>
                  <th className="px-4 py-3">Obyekt</th>
                  <th className="px-4 py-3">O‘zgarishlar</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((l: any) => (
                  <tr key={l.id} className="border-b border-slate-100 dark:border-slate-800 align-top hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="whitespace-nowrap px-4 py-3 text-xs">{fmtDate(l.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{l.user?.fullName ?? 'Tizim'}</div>
                      <div className="text-xs text-slate-400">{l.user?.email ?? ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={ACTION_COLORS[l.action] ?? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'}>
                        {l.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div>{l.entity}</div>
                      {l.entityId && <div className="font-mono text-[10px] text-slate-400">{l.entityId.slice(0, 8)}...</div>}
                    </td>
                    <td className="max-w-[320px] px-4 py-3 text-xs">
                      {l.oldValue && (
                        <div className="truncate text-red-600/70">− {JSON.stringify(l.oldValue)}</div>
                      )}
                      {l.newValue && (
                        <div className="truncate text-green-700/70">+ {JSON.stringify(l.newValue)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">{l.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={page} totalPages={data.meta.totalPages} onPage={setPage} />}
      </Card>
    </div>
  );
}
