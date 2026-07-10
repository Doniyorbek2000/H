'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Landmark } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button, Input, Label } from '@/components/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Kirishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
            <Landmark size={28} />
          </div>
          <h1 className="text-2xl font-bold">Smart Murojaat AI</h1>
          <p className="mt-1 text-sm text-primary-100">
            Murojaatlar bilan ishlash boshqaruv paneli
          </p>
        </div>
        <form onSubmit={submit} className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
          <div className="mb-4">
            <Label>Email yoki telefon</Label>
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="admin@example.com"
              required
              autoFocus
            />
          </div>
          <div className="mb-4">
            <Label>Parol</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</div>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Kirilmoqda...' : 'Kirish'}
          </Button>
          <p className="mt-4 text-center text-xs text-slate-400">
            Demo: admin@example.com / Admin123!
          </p>
        </form>
        <p className="mt-4 text-center text-sm">
          <a href="/" className="text-primary-100 underline hover:text-white">
            ← Fuqaro portali (murojaat yuborish)
          </a>
        </p>
      </div>
    </div>
  );
}
