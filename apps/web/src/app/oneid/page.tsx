'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { storeSession, api } from '@/lib/api';

function OneIdInner() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const access = params.get('access');
    const refresh = params.get('refresh');
    if (!access || !refresh) {
      router.replace('/login?oneid_error=1');
      return;
    }
    (async () => {
      // Tokenlarni saqlab, foydalanuvchi ma'lumotini olamiz
      localStorage.setItem('sm_access', access);
      localStorage.setItem('sm_refresh', refresh);
      try {
        const me = await api('/auth/me');
        storeSession({ accessToken: access, refreshToken: refresh, user: me });
        router.replace(me.role === 'CITIZEN' ? '/' : '/dashboard');
      } catch {
        router.replace('/login?oneid_error=1');
      }
    })();
  }, [params, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        <p className="text-sm text-slate-500">OneID orqali kirilmoqda...</p>
      </div>
    </div>
  );
}

export default function OneIdCallbackPage() {
  return (
    <Suspense fallback={null}>
      <OneIdInner />
    </Suspense>
  );
}
