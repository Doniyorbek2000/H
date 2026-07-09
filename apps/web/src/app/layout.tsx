import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Smart Murojaat AI',
  description:
    'Hokimliklar va davlat tashkilotlari uchun AI asosidagi murojaatlar bilan ishlash platformasi',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
