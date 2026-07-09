'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bot, Download, FileBarChart, FileSpreadsheet } from 'lucide-react';
import { api, apiDownload } from '@/lib/api';
import { fmtDate } from '@/lib/labels';
import {
  Badge, Button, Card, EmptyState, ErrorState, Modal, TableSkeleton, useToast,
} from '@/components/ui';

const TYPE_LABELS: Record<string, string> = { DAILY: 'Kunlik', WEEKLY: 'Haftalik', MONTHLY: 'Oylik' };

export default function ReportsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);

  const load = useCallback(() => {
    api('/reports?limit=30').then(setData).catch((e) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  const generate = async (type: 'daily' | 'weekly' | 'monthly') => {
    setGenerating(type);
    try {
      await api(`/reports/${type}`, { method: 'POST' });
      toast('Hisobot tayyorlandi (AI xulosa bilan)');
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Hisobotlar</h1>
          <p className="text-sm text-slate-500">AI xulosali boshqaruv hisobotlari, PDF/Excel eksport</p>
        </div>
        <div className="flex gap-2">
          {(['daily', 'weekly', 'monthly'] as const).map((t) => (
            <Button key={t} variant="secondary" disabled={!!generating} onClick={() => generate(t)}>
              <Bot size={15} />
              {generating === t ? 'Tayyorlanmoqda...' : `${TYPE_LABELS[t.toUpperCase()]} hisobot`}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        {error && <ErrorState message={error} />}
        {!data && !error && <TableSkeleton />}
        {data?.data.length === 0 && (
          <EmptyState message="Hisobotlar hali yaratilmagan. Yuqoridagi tugmalar orqali yarating." />
        )}
        {data?.data.length > 0 && (
          <div className="divide-y divide-slate-100">
            {data.data.map((r: any) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => setSelected(r)}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <FileBarChart size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{r.title}</div>
                    <div className="text-xs text-slate-500">
                      {r.createdBy?.fullName ?? '—'} · {fmtDate(r.createdAt)}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <Badge className="border-primary-200 bg-primary-50 text-primary-700">{TYPE_LABELS[r.type]}</Badge>
                  <Button size="sm" variant="secondary" onClick={() => apiDownload(`/reports/${r.id}/download?format=pdf`, `hisobot-${r.id.slice(0, 8)}.pdf`).catch((e) => toast(e.message, 'error'))}>
                    <Download size={14} /> PDF
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => apiDownload(`/reports/${r.id}/download?format=xlsx`, `hisobot-${r.id.slice(0, 8)}.xlsx`).catch((e) => toast(e.message, 'error'))}>
                    <FileSpreadsheet size={14} /> Excel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title ?? ''} wide>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Jami', selected.content.total],
                ['Bajarilgan', selected.content.completed],
                ['Kechikkan', selected.content.overdue],
                ['Bajarilish %', `${selected.content.completionRate}%`],
              ].map(([k, v]) => (
                <div key={k as string} className="rounded-lg bg-slate-50 p-3 text-center">
                  <div className="text-xl font-bold">{v as any}</div>
                  <div className="text-xs text-slate-500">{k as string}</div>
                </div>
              ))}
            </div>
            {selected.content.topCategories?.length > 0 && (
              <div>
                <h4 className="mb-2 font-semibold">Eng ko‘p yo‘nalishlar</h4>
                {selected.content.topCategories.map((c: any, i: number) => (
                  <div key={i} className="flex justify-between border-b border-slate-100 py-1.5">
                    <span>{c.name}</span>
                    <span className="font-medium">{c.count} ta</span>
                  </div>
                ))}
              </div>
            )}
            {selected.aiSummary && (
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
                <h4 className="mb-2 flex items-center gap-1.5 font-semibold text-violet-900">
                  <Bot size={15} /> AI xulosasi
                </h4>
                <p className="whitespace-pre-wrap leading-relaxed text-slate-700">{selected.aiSummary}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
