'use client';

import { useEffect } from 'react';

/**
 * Service worker'ni ro'yxatga oladi (PWA o'rnatilishi + offline).
 * Faqat production'da va brauzer qo'llab-quvvatlasa ishlaydi.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      typeof navigator === 'undefined' ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* SW ro'yxatdan o'tmasa, ilova baribir ishlaydi */
      });
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
