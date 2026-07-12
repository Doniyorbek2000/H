'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { storeSession, api } from '@/lib/api';

function OneIdInner() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = params.get('code');
    if (!code) {
      router.replace('/login?oneid_error=1');
      return;
    }
    (async () => {
      // Bir martalik kodni sessiya tokenlariga almashtiramiz (tokenlar URLda ko'rinmaydi)
      try {
        const session = await api('/auth/oneid/exchange', {
          method: 'POST',
          body: JSON.stringify({ code }),
        });
        storeSession({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          user: session.user,
        });
        router.replace(session.user.role === 'CITIZEN' ? '/' : '/dashboard');
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
