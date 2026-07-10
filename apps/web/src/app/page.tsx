'use client';

import { useEffect, useState } from 'react';
import { Landmark, Search, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { STATUS_LABELS_UZ, STATUS_BADGE, fmtDate } from '@/lib/labels';
import { Badge, Button, Card, Input, Label, Select, Textarea, useToast } from '@/components/ui';

interface Category {
  id: string;
  name: string;
}

export default function PublicPortal() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'new' | 'track'>('new');
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    citizenName: '',
    citizenPhone: '',
    citizenJshshir: '',
    mahalla: '',
    address: '',
    categoryId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [trackNumber, setTrackNumber] = useState('');
  const [tracked, setTracked] = useState<any>(null);
  const [trackError, setTrackError] = useState('');
  const [rating, setRating] = useState(0);
  const [ratingSent, setRatingSent] = useState(false);

  useEffect(() => {
    api<{ data: Category[] }>('/categories?limit=50&isActive=true', { auth: false })
      .then((r) => setCategories(r.data))
      .catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await api('/appeals/public', {
        method: 'POST',
        auth: false,
        body: {
          ...form,
          categoryId: form.categoryId || undefined,
          citizenJshshir: form.citizenJshshir || undefined,
          source: 'WEB',
        },
      });
      setResult(created);
      toast('Murojaatingiz muvaffaqiyatli yuborildi!');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const track = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError('');
    setTracked(null);
    setRating(0);
    setRatingSent(false);
    try {
      const data = await api(`/appeals/track/${encodeURIComponent(trackNumber.trim())}`, {
        auth: false,
      });
      setTracked(data);
    } catch (err: any) {
      setTrackError(err.message);
    }
  };

  const sendRating = async (value: number) => {
    setRating(value);
    try {
      await api(`/appeals/track/${encodeURIComponent(tracked.appealNumber)}/rate`, {
        method: 'POST',
        auth: false,
        body: { rating: value },
      });
      setRatingSent(true);
      toast('Bahoyingiz uchun rahmat!');
    } catch (err: any) {
      setRating(0);
      toast(err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
              <Landmark size={20} />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">Smart Murojaat AI</h1>
              <p className="text-xs text-slate-500">Fuqarolar murojaatlari portali</p>
            </div>
          </div>
          <a href="/login" className="text-sm text-primary-600 hover:underline">
            Xodimlar uchun kirish
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex gap-2">
          <Button
            variant={tab === 'new' ? 'primary' : 'secondary'}
            onClick={() => setTab('new')}
            className="flex-1"
          >
            <Send size={16} /> Murojaat yuborish
          </Button>
          <Button
            variant={tab === 'track' ? 'primary' : 'secondary'}
            onClick={() => setTab('track')}
            className="flex-1"
          >
            <Search size={16} /> Holatni tekshirish
          </Button>
        </div>

        {tab === 'new' && !result && (
          <Card className="p-6">
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>F.I.Sh. *</Label>
                  <Input
                    required
                    value={form.citizenName}
                    onChange={(e) => setForm({ ...form, citizenName: e.target.value })}
                    placeholder="Aliyev Vali"
                  />
                </div>
                <div>
                  <Label>Telefon raqam *</Label>
                  <Input
                    required
                    value={form.citizenPhone}
                    onChange={(e) => setForm({ ...form, citizenPhone: e.target.value })}
                    placeholder="+998901234567"
                  />
                </div>
              </div>
              <div>
                <Label>JShShIR (ixtiyoriy, 14 raqam)</Label>
                <Input
                  value={form.citizenJshshir}
                  onChange={(e) => setForm({ ...form, citizenJshshir: e.target.value })}
                  placeholder="12345678901234"
                  maxLength={14}
                  pattern="[0-9]{14}"
                  title="14 ta raqamdan iborat JShShIR"
                />
              </div>
              <div>
                <Label>Murojaat mavzusi *</Label>
                <Input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Masalan: Ko‘chada suv quvuri yorildi"
                />
              </div>
              <div>
                <Label>Batafsil tavsif * (kamida 10 belgi)</Label>
                <Textarea
                  required
                  minLength={10}
                  rows={5}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Muammoni batafsil yozing: qachondan beri, qayerda, kimlarga ta’sir qilmoqda..."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Yo‘nalish (ixtiyoriy — AI o‘zi aniqlaydi)</Label>
                  <Select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  >
                    <option value="">AI avtomatik aniqlasin</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Mahalla</Label>
                  <Input
                    value={form.mahalla}
                    onChange={(e) => setForm({ ...form, mahalla: e.target.value })}
                    placeholder="Guliston mahallasi"
                  />
                </div>
              </div>
              <div>
                <Label>Manzil</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Ko‘cha, uy raqami"
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Yuborilmoqda...' : 'Murojaatni yuborish'}
              </Button>
            </form>
          </Card>
        )}

        {tab === 'new' && result && (
          <Card className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
              ✅
            </div>
            <h2 className="mb-2 text-xl font-bold">Murojaatingiz qabul qilindi!</h2>
            <p className="mb-4 text-sm text-slate-600">
              Murojaat raqamingizni saqlab qo‘ying — holatni shu raqam orqali kuzatasiz:
            </p>
            <div className="mb-6 inline-block rounded-xl bg-primary-50 px-6 py-3 text-2xl font-bold text-primary-700">
              {result.appealNumber}
            </div>
            <p className="mb-6 text-sm text-slate-500">
              Murojaatingiz AI yordamida tahlil qilinib, mas’ul bo‘limga yo‘naltiriladi.
            </p>
            <Button variant="secondary" onClick={() => setResult(null)}>
              Yana murojaat yuborish
            </Button>
          </Card>
        )}

        {tab === 'track' && (
          <Card className="p-6">
            <form onSubmit={track} className="mb-4 flex gap-2">
              <Input
                value={trackNumber}
                onChange={(e) => setTrackNumber(e.target.value)}
                placeholder="SM-20260709-0001"
                required
              />
              <Button type="submit">Tekshirish</Button>
            </form>
            {trackError && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{trackError}</div>
            )}
            {tracked && (
              <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold">{tracked.appealNumber}</span>
                  <Badge className={STATUS_BADGE[tracked.status]}>
                    {STATUS_LABELS_UZ[tracked.status as keyof typeof STATUS_LABELS_UZ] ??
                      tracked.status}
                  </Badge>
                </div>
                <p className="font-medium">{tracked.title}</p>
                <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                  <div>Yo‘nalish: {tracked.category?.name ?? '—'}</div>
                  <div>Bo‘lim: {tracked.department?.name ?? '—'}</div>
                  <div>Yuborilgan: {fmtDate(tracked.createdAt)}</div>
                  <div>Muddat: {fmtDate(tracked.deadlineAt)}</div>
                </div>
                {['COMPLETED', 'CLOSED'].includes(tracked.status) && !tracked.citizenRating && !ratingSent && (
                  <div className="border-t border-slate-100 pt-3">
                    <p className="mb-2 text-sm font-medium">Xizmatni baholang:</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => sendRating(v)}
                          className={`text-2xl transition-transform hover:scale-110 ${
                            v <= rating ? '' : 'grayscale opacity-40'
                          }`}
                          aria-label={`${v} ball`}
                        >
                          ⭐
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {(tracked.citizenRating || ratingSent) && (
                  <div className="border-t border-slate-100 pt-3 text-sm text-slate-600">
                    Sizning bahoyingiz: {'⭐'.repeat(tracked.citizenRating ?? rating)} — rahmat!
                  </div>
                )}
                {tracked.comments?.length > 0 && (
                  <div className="border-t border-slate-100 pt-3">
                    <p className="mb-2 text-xs font-semibold text-slate-500">Javoblar:</p>
                    {tracked.comments.map((c: any, i: number) => (
                      <div key={i} className="mb-2 rounded-lg bg-slate-50 p-3 text-sm">
                        {c.message}
                        <div className="mt-1 text-xs text-slate-400">{fmtDate(c.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
