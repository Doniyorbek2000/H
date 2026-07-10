'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import {
  Badge, Button, Card, ConfirmModal, EmptyState, ErrorState, Input, Label, Modal, Select, TableSkeleton, useToast,
} from '@/components/ui';

const EMPTY = { name: '', description: '', defaultDeadlineHours: 72, departmentId: '' };

export default function CategoriesPage() {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<null | { mode: 'create' } | { mode: 'edit'; id: string }>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const load = useCallback(() => {
    api('/categories?limit=100').then(setData).catch((e) => setError(e.message));
  }, []);

  useEffect(load, [load]);
  useEffect(() => {
    api('/departments?limit=100').then((r) => setDepartments(r.data)).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        ...form,
        defaultDeadlineHours: Number(form.defaultDeadlineHours),
        departmentId: form.departmentId || undefined,
      };
      if (modal?.mode === 'edit') {
        await api(`/categories/${modal.id}`, { method: 'PATCH', body });
        toast('Kategoriya yangilandi');
      } else {
        await api('/categories', { method: 'POST', body });
        toast('Kategoriya yaratildi');
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
          <h1 className="text-xl font-bold">Kategoriyalar</h1>
          <p className="text-sm text-slate-500">Murojaat yo‘nalishlari va standart ijro muddatlari</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setModal({ mode: 'create' }); }}>
          <Plus size={16} /> Kategoriya qo‘shish
        </Button>
      </div>

      <Card>
        {error && <ErrorState message={error} />}
        {!data && !error && <TableSkeleton />}
        {data?.data.length === 0 && <EmptyState />}
        {data?.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-3">Nomi</th>
                  <th className="px-4 py-3">Tavsif</th>
                  <th className="px-4 py-3">Standart muddat</th>
                  <th className="px-4 py-3">Mas’ul bo‘lim</th>
                  <th className="px-4 py-3">Murojaatlar</th>
                  <th className="px-4 py-3">Holat</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.data.map((c: any) => (
                  <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="max-w-[240px] truncate px-4 py-3 text-slate-500">{c.description ?? '—'}</td>
                    <td className="px-4 py-3">{c.defaultDeadlineHours} soat</td>
                    <td className="px-4 py-3">{c.department?.name ?? '—'}</td>
                    <td className="px-4 py-3">{c._count.appeals}</td>
                    <td className="px-4 py-3">
                      <Badge className={c.isActive ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-100 text-gray-600'}>
                        {c.isActive ? 'Faol' : 'Faol emas'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          onClick={() => {
                            setForm({ name: c.name, description: c.description ?? '', defaultDeadlineHours: c.defaultDeadlineHours, departmentId: c.departmentId ?? '', isActive: c.isActive });
                            setModal({ mode: 'edit', id: c.id });
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        {c.isActive && (
                          <button className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => setRemoveId(c.id)}>
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Nomi *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Tavsif</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Standart muddat (soat) *</Label>
              <Input type="number" min={1} required value={form.defaultDeadlineHours} onChange={(e) => setForm({ ...form, defaultDeadlineHours: e.target.value })} />
            </div>
            <div>
              <Label>Mas’ul bo‘lim</Label>
              <Select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                <option value="">Tanlanmagan</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>Bekor qilish</Button>
            <Button type="submit">Saqlash</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!removeId}
        onClose={() => setRemoveId(null)}
        onConfirm={async () => {
          try {
            await api(`/categories/${removeId}`, { method: 'DELETE' });
            toast('Kategoriya faolsizlantirildi');
            load();
          } catch (e: any) {
            toast(e.message, 'error');
          }
        }}
        title="Kategoriyani o‘chirish"
        message="Kategoriya faolsizlantiriladi (murojaatlar tarixi saqlanadi). Davom etasizmi?"
        danger
      />
    </div>
  );
}
