'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Search, UserX } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ROLE_LABELS_UZ, fmtDateShort } from '@/lib/labels';
import {
  Badge, Button, Card, ConfirmModal, EmptyState, ErrorState, Input, Label, Modal,
  Pagination, Select, TableSkeleton, useToast,
} from '@/components/ui';

const EMPTY_FORM = { fullName: '', email: '', phone: '', password: '', role: 'EXECUTOR', departmentId: '' };

export default function UsersPage() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<null | { mode: 'create' } | { mode: 'edit'; id: string }>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [deactivate, setDeactivate] = useState<string | null>(null);

  const canEdit = me && ['SUPER_ADMIN', 'ADMIN'].includes(me.role);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '15' });
    if (q) params.set('search', q);
    if (role) params.set('role', role);
    api(`/users?${params}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, q, role]);

  useEffect(load, [load]);
  useEffect(() => {
    api('/departments?limit=100').then((r) => setDepartments(r.data)).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body: any = { ...form, departmentId: form.departmentId || undefined, phone: form.phone || undefined };
      if (!body.password) delete body.password;
      if (modal?.mode === 'edit') {
        await api(`/users/${modal.id}`, { method: 'PATCH', body });
        toast('Xodim yangilandi');
      } else {
        await api('/users', { method: 'POST', body });
        toast('Xodim qo‘shildi');
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
          <h1 className="text-xl font-bold">Xodimlar</h1>
          <p className="text-sm text-slate-500">{data ? `Jami: ${data.meta.total} ta` : ''}</p>
        </div>
        {canEdit && (
          <Button onClick={() => { setForm(EMPTY_FORM); setModal({ mode: 'create' }); }}>
            <Plus size={16} /> Xodim qo‘shish
          </Button>
        )}
      </div>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Ism, email, telefon bo‘yicha qidiruv..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="">Barcha rollar</option>
            {Object.entries(ROLE_LABELS_UZ).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        {error && <ErrorState message={error} />}
        {loading && <TableSkeleton />}
        {!loading && data?.data.length === 0 && <EmptyState />}
        {!loading && data?.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-3">Xodim</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Bo‘lim</th>
                  <th className="px-4 py-3">Telefon</th>
                  <th className="px-4 py-3">Holat</th>
                  <th className="px-4 py-3">Qo‘shilgan</th>
                  {canEdit && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {data.data.map((u: any) => (
                  <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.fullName}</div>
                      <div className="text-xs text-slate-400">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="border-primary-200 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                        {(ROLE_LABELS_UZ as any)[u.role]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{u.department?.name ?? '—'}</td>
                    <td className="px-4 py-3">{u.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge className={u.isActive ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-100 text-gray-600'}>
                        {u.isActive ? 'Faol' : 'Faol emas'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs">{fmtDateShort(u.createdAt)}</td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => {
                              setForm({ fullName: u.fullName, email: u.email, phone: u.phone ?? '', password: '', role: u.role, departmentId: u.departmentId ?? '', isActive: u.isActive });
                              setModal({ mode: 'edit', id: u.id });
                            }}
                          >
                            <Pencil size={15} />
                          </button>
                          {u.isActive && (
                            <button className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => setDeactivate(u.id)}>
                              <UserX size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={page} totalPages={data.meta.totalPages} onPage={setPage} />}
      </Card>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Xodimni tahrirlash' : 'Yangi xodim'}>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>F.I.Sh. *</Label><Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
          <div><Label>Email *</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div>
            <Label>{modal?.mode === 'edit' ? 'Yangi parol (bo‘sh qoldirsangiz o‘zgarmaydi)' : 'Parol *'}</Label>
            <Input type="password" required={modal?.mode !== 'edit'} minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Rol *</Label>
              <Select required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {Object.entries(ROLE_LABELS_UZ)
                  .filter(([k]) => me?.role === 'SUPER_ADMIN' || k !== 'SUPER_ADMIN')
                  .map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
              </Select>
            </div>
            <div>
              <Label>Bo‘lim</Label>
              <Select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                <option value="">Bo‘limsiz</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </div>
          </div>
          {modal?.mode === 'edit' && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4" />
              Faol
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>Bekor qilish</Button>
            <Button type="submit">Saqlash</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deactivate}
        onClose={() => setDeactivate(null)}
        onConfirm={async () => {
          try {
            await api(`/users/${deactivate}`, { method: 'DELETE' });
            toast('Xodim faolsizlantirildi');
            load();
          } catch (e: any) {
            toast(e.message, 'error');
          }
        }}
        title="Xodimni faolsizlantirish"
        message="Xodim tizimga kira olmaydi, lekin tarixiy ma’lumotlari saqlanadi. Davom etasizmi?"
        danger
      />
    </div>
  );
}
