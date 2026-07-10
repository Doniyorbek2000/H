'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Pencil, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Badge, Button, Card, EmptyState, ErrorState, Input, Label, Modal, Select, TableSkeleton, Textarea, useToast,
} from '@/components/ui';

const EMPTY = { name: '', description: '', managerId: '' };

export default function DepartmentsPage() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<null | { mode: 'create' } | { mode: 'edit'; id: string }>(null);
  const [form, setForm] = useState<any>(EMPTY);

  const canEdit = me && ['SUPER_ADMIN', 'ADMIN'].includes(me.role);

  const load = useCallback(() => {
    api('/departments?limit=100')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(load, [load]);
  useEffect(() => {
    api('/users?limit=100&isActive=true').then((r) => setUsers(r.data)).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = { ...form, managerId: form.managerId || undefined };
      if (modal?.mode === 'edit') {
        await api(`/departments/${modal.id}`, { method: 'PATCH', body });
        toast('Bo‘lim yangilandi');
      } else {
        await api('/departments', { method: 'POST', body });
        toast('Bo‘lim yaratildi');
      }
      setModal(null);
      load();
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Bo‘limlar</h1>
          <p className="text-sm text-slate-500">Tashkilot bo‘limlari va mas’ul rahbarlar</p>
        </div>
        {canEdit && (
          <Button onClick={() => { setForm(EMPTY); setModal({ mode: 'create' }); }}>
            <Plus size={16} /> Bo‘lim qo‘shish
          </Button>
        )}
      </div>

      {error && <ErrorState message={error} />}
      {!data && !error && <TableSkeleton />}
      {data?.data.length === 0 && <EmptyState message="Bo‘limlar hali yaratilmagan" />}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.data.map((d: any) => (
          <Card key={d.id} className="p-5">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600">
                <Building2 size={19} />
              </div>
              <div className="flex items-center gap-1">
                {!d.isActive && <Badge className="border-gray-200 bg-gray-100 text-gray-600">Faol emas</Badge>}
                {canEdit && (
                  <button
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => {
                      setForm({ name: d.name, description: d.description ?? '', managerId: d.managerId ?? '' });
                      setModal({ mode: 'edit', id: d.id });
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                )}
              </div>
            </div>
            <h3 className="font-semibold">{d.name}</h3>
            {d.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{d.description}</p>}
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Rahbar:</dt><dd className="font-medium">{d.manager?.fullName ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Xodimlar:</dt><dd>{d._count.users}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Murojaatlar:</dt><dd>{d._count.appeals}</dd></div>
            </dl>
            {d.categories?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {d.categories.map((c: any) => (
                  <Badge key={c.id} className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">{c.name}</Badge>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Bo‘limni tahrirlash' : 'Yangi bo‘lim'}>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Nomi *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Tavsif</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div>
            <Label>Bo‘lim rahbari</Label>
            <Select value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
              <option value="">Tanlanmagan</option>
              {users.filter((u) => ['MANAGER', 'ADMIN', 'EXECUTOR'].includes(u.role)).map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>Bekor qilish</Button>
            <Button type="submit">Saqlash</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
