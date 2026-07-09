'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bot, Landmark, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Badge, Button, Card, ErrorState, Input, Label, Skeleton, useToast } from '@/components/ui';

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [error, setError] = useState('');
  const [orgForm, setOrgForm] = useState({ name: '', address: '', phone: '', email: '' });
  const [deadline, setDeadline] = useState('72');

  const canEdit = user && ['SUPER_ADMIN', 'ADMIN'].includes(user.role);

  const load = useCallback(() => {
    api('/settings')
      .then((s) => {
        setData(s);
        const dl = s.settings.find((x: any) => x.key === 'deadline.default');
        if (dl) setDeadline(dl.value);
      })
      .catch((e) => setError(e.message));
    if (user?.organizationId) {
      api(`/organizations/${user.organizationId}`)
        .then((o) => {
          setOrg(o);
          setOrgForm({ name: o.name, address: o.address ?? '', phone: o.phone ?? '', email: o.email ?? '' });
        })
        .catch(() => {});
    }
  }, [user]);

  useEffect(load, [load]);

  if (error) return <ErrorState message={error} />;
  if (!data) return <Skeleton className="h-64" />;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Sozlamalar</h1>
        <p className="text-sm text-slate-500">Tashkilot, AI va Telegram integratsiya sozlamalari</p>
      </div>

      <Card className="p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Bot size={16} className="text-violet-600" /> Tizim integratsiyalari
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
            <div>
              <div className="font-medium">Gemini AI</div>
              <div className="text-xs text-slate-500">Model: {data.system.aiModel}</div>
            </div>
            <Badge className={data.system.aiEnabled ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700'}>
              {data.system.aiEnabled ? 'Ulangan' : 'API key yo‘q — fallback rejim'}
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
            <div>
              <div className="font-medium">Telegram bot</div>
              <div className="text-xs text-slate-500">Xabarnomalar va fuqaro murojaatlari</div>
            </div>
            <Badge className={data.system.telegramEnabled ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700'}>
              {data.system.telegramEnabled ? 'Ulangan' : 'Token sozlanmagan'}
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            AI kaliti va bot tokeni server .env faylida sozlanadi (GEMINI_API_KEY, TELEGRAM_BOT_TOKEN).
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              api('/notifications/send-test', { method: 'POST', body: {} })
                .then(() => toast('Test xabar yuborildi (bildirishnomalarni tekshiring)'))
                .catch((e) => toast(e.message, 'error'))
            }
          >
            <Send size={14} /> Test notification yuborish
          </Button>
        </div>
      </Card>

      {canEdit && (
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold">⏱ Muddat sozlamalari</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              api('/settings', { method: 'PUT', body: { key: 'deadline.default', value: deadline } })
                .then(() => toast('Saqlandi'))
                .catch((err) => toast(err.message, 'error'));
            }}
            className="flex items-end gap-3"
          >
            <div className="flex-1">
              <Label>Standart ijro muddati (soat)</Label>
              <Input type="number" min={1} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <Button type="submit">Saqlash</Button>
          </form>
          <p className="mt-2 text-xs text-slate-400">
            Kategoriya bo‘yicha muddatlar “Kategoriyalar” sahifasida alohida sozlanadi.
          </p>
        </Card>
      )}

      {org && canEdit && (
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Landmark size={16} /> Tashkilot ma’lumotlari
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              api(`/organizations/${org.id}`, { method: 'PATCH', body: orgForm })
                .then(() => toast('Tashkilot ma’lumotlari yangilandi'))
                .catch((err) => toast(err.message, 'error'));
            }}
            className="space-y-3"
          >
            <div><Label>Nomi</Label><Input value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} /></div>
            <div><Label>Manzil</Label><Input value={orgForm.address} onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telefon</Label><Input value={orgForm.phone} onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={orgForm.email} onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })} /></div>
            </div>
            <div className="flex justify-end"><Button type="submit">Saqlash</Button></div>
          </form>
        </Card>
      )}
    </div>
  );
}
