'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { api } from '@/lib/api';
import {
  PRIORITY_BADGE,
  PRIORITY_LABELS_UZ,
  SOURCE_LABELS_UZ,
  STATUS_BADGE,
  STATUS_LABELS_UZ,
  fmtDate,
} from '@/lib/labels';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Label,
  Modal,
  Pagination,
  Select,
  TableSkeleton,
  Textarea,
  useToast,
} from '@/components/ui';
import { useAuth } from '@/lib/auth';

function AppealsInner() {
  const search = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const [q, setQ] = useState(search.get('search') ?? '');
  const [status, setStatus] = useState(search.get('status') ?? '');
  const [priority, setPriority] = useState(search.get('priority') ?? '');
  const [categoryId, setCategoryId] = useState('');
  const [overdue, setOverdue] = useState(search.get('overdue') === 'true');
  const [page, setPage] = useState(1);

  const [form, setForm] = useState({
    title: '',
    description: '',
    citizenName: '',
    citizenPhone: '',
    mahalla: '',
    address: '',
    categoryId: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '15' });
    if (q) params.set('search', q);
    if (status) params.set('status', status);
    if (priority) params.set('priority', priority);
    if (categoryId) params.set('categoryId', categoryId);
    if (overdue) params.set('overdue', 'true');
    api(`/appeals?${params}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, q, status, priority, categoryId, overdue]);

  useEffect(load, [load]);
  useEffect(() => {
    api('/categories?limit=50').then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const createAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api('/appeals', {
        method: 'POST',
        body: { ...form, categoryId: form.categoryId || undefined, source: 'OPERATOR' },
      });
      toast(`Murojaat yaratildi: ${created.appealNumber}`);
      setShowCreate(false);
      router.push(`/appeals/${created.id}`);
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Murojaatlar</h1>
          <p className="text-sm text-slate-500">
            {data ? `Jami: ${data.meta.total} ta` : 'Yuklanmoqda...'}
          </p>
        </div>
        {user && ['SUPER_ADMIN', 'ADMIN', 'OPERATOR'].includes(user.role) && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Yangi murojaat
          </Button>
        )}
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Qidiruv: raqam, mavzu, fuqaro..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Barcha holatlar</option>
            {Object.entries(STATUS_LABELS_UZ).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
            <option value="">Barcha ustuvorliklar</option>
            {Object.entries(PRIORITY_LABELS_UZ).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
            <option value="">Barcha kategoriyalar</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={overdue}
            onChange={(e) => { setOverdue(e.target.checked); setPage(1); }}
            className="h-4 w-4 rounded border-slate-300 dark:border-slate-600"
          />
          Faqat kechikayotganlar
        </label>
      </Card>

      <Card>
        {error && <ErrorState message={error} />}
        {loading && <TableSkeleton rows={8} />}
        {!loading && !error && data?.data.length === 0 && (
          <EmptyState message="Murojaatlar topilmadi. Filtrlarni o‘zgartirib ko‘ring." />
        )}
        {!loading && !error && data?.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-3">Raqam</th>
                  <th className="px-4 py-3">Mavzu</th>
                  <th className="px-4 py-3">Kategoriya</th>
                  <th className="px-4 py-3">Holat</th>
                  <th className="px-4 py-3">Ustuvorlik</th>
                  <th className="px-4 py-3">Mas’ul xodim</th>
                  <th className="px-4 py-3">Manba</th>
                  <th className="px-4 py-3">Muddat</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((a: any) => (
                  <tr
                    key={a.id}
                    className="cursor-pointer border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    onClick={() => router.push(`/appeals/${a.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-xs">{a.appealNumber}</td>
                    <td className="max-w-[280px] px-4 py-3">
                      <div className="truncate font-medium">{a.title}</div>
                      <div className="truncate text-xs text-slate-400">{a.citizenName}</div>
                    </td>
                    <td className="px-4 py-3">{a.category?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_BADGE[a.status]}>
                        {(STATUS_LABELS_UZ as any)[a.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={PRIORITY_BADGE[a.priority]}>
                        {(PRIORITY_LABELS_UZ as any)[a.priority]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{a.assignedTo?.fullName ?? '—'}</td>
                    <td className="px-4 py-3 text-xs">{(SOURCE_LABELS_UZ as any)[a.source]}</td>
                    <td className="px-4 py-3 text-xs">{fmtDate(a.deadlineAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && (
          <Pagination page={page} totalPages={data.meta.totalPages} onPage={setPage} />
        )}
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Yangi murojaat (operator)" wide>
        <form onSubmit={createAppeal} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Fuqaro F.I.Sh. *</Label>
              <Input required value={form.citizenName} onChange={(e) => setForm({ ...form, citizenName: e.target.value })} />
            </div>
            <div>
              <Label>Telefon *</Label>
              <Input required value={form.citizenPhone} onChange={(e) => setForm({ ...form, citizenPhone: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Mavzu *</Label>
            <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Tavsif *</Label>
            <Textarea required minLength={10} rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Kategoriya</Label>
              <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">AI aniqlasin</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Mahalla</Label>
              <Input value={form.mahalla} onChange={(e) => setForm({ ...form, mahalla: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Manzil</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Bekor qilish</Button>
            <Button type="submit">Yaratish</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function AppealsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <AppealsInner />
    </Suspense>
  );
}
