'use client';

import { useCallback, useEffect, useState } from 'react';
import { Landmark, Pencil, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Badge, Button, Card, EmptyState, ErrorState, Input, Label, Modal, Select, TableSkeleton, useToast,
} from '@/components/ui';

const TYPE_LABELS: Record<string, string> = {
  HOKIMLIK: 'Hokimlik',
  KOMMUNAL: 'Kommunal xizmat',
  BOSHQARMA: 'Boshqarma',
  AGENTLIK: 'Agentlik',
};

const EMPTY = { name: '', type: 'HOKIMLIK', region: '', district: '', address: '', phone: '', email: '' };

export default function OrganizationsPage() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<null | { mode: 'create' } | { mode: 'edit'; id: string }>(null);
  const [form, setForm] = useState<any>(EMPTY);

  const isSuper = me?.role === 'SUPER_ADMIN';

  const load = useCallback(() => {
    api('/organizations?limit=100').then(setData).catch((e) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        ...form,
        address: form.address || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
      };
      if (modal?.mode === 'edit') {
        await api(`/organizations/${modal.id}`, { method: 'PATCH', body });
        toast('Tashkilot yangilandi');
      } else {
        await api('/organizations', { method: 'POST', body });
        toast('Tashkilot yaratildi');
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
          <h1 className="text-xl font-bold">Tashkilotlar</h1>
          <p className="text-sm text-slate-500">Hokimliklar, kommunal xizmatlar, boshqarmalar</p>
        </div>
        {isSuper && (
          <Button onClick={() => { setForm(EMPTY); setModal({ mode: 'create' }); }}>
            <Plus size={16} /> Tashkilot qo‘shish
          </Button>
        )}
      </div>

      {error && <ErrorState message={error} />}
      {!data && !error && <TableSkeleton />}
      {data?.data.length === 0 && <EmptyState message="Tashkilotlar hali yaratilmagan" />}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.data.map((o: any) => (
          <Card key={o.id} className="p-5">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <Landmark size={19} />
              </div>
              <div className="flex items-center gap-1">
                <Badge className="border-primary-200 bg-primary-50 text-primary-700">
                  {TYPE_LABELS[o.type] ?? o.type}
                </Badge>
                <button
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
                  onClick={() => {
                    setForm({
                      name: o.name, type: o.type, region: o.region, district: o.district,
                      address: o.address ?? '', phone: o.phone ?? '', email: o.email ?? '',
                    });
                    setModal({ mode: 'edit', id: o.id });
                  }}
                >
                  <Pencil size={15} />
                </button>
              </div>
            </div>
            <h3 className="font-semibold">{o.name}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{o.region}, {o.district}</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Bo‘limlar:</dt><dd>{o._count.departments}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Xodimlar:</dt><dd>{o._count.users}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Murojaatlar:</dt><dd className="font-medium">{o._count.appeals}</dd></div>
              {o.phone && <div className="flex justify-between"><dt className="text-slate-500">Telefon:</dt><dd>{o.phone}</dd></div>}
            </dl>
          </Card>
        ))}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Tashkilotni tahrirlash' : 'Yangi tashkilot'}>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Nomi *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <Label>Turi *</Label>
            <Select required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Viloyat *</Label><Input required value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></div>
            <div><Label>Tuman/shahar *</Label><Input required value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></div>
          </div>
          <div><Label>Manzil</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
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
