'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Building2,
  FileBarChart,
  FileText,
  FolderKanban,
  Landmark,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Map,
  Menu,
  ScrollText,
  Settings,
  Trophy,
  Users,
} from 'lucide-react';
import { RequireAuth, useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { ROLE_LABELS_UZ } from '@/lib/labels';
import { cn } from '@/components/ui';

const NAV = [
  { href: '/dashboard', label: 'Boshqaruv paneli', icon: LayoutDashboard, roles: null },
  { href: '/appeals', label: 'Murojaatlar', icon: ListChecks, roles: null },
  { href: '/map', label: 'Xarita', icon: Map, roles: null },
  { href: '/kpi', label: 'KPI reyting', icon: Trophy, roles: null },
  { href: '/reports', label: 'Hisobotlar', icon: FileBarChart, roles: ['SUPER_ADMIN', 'ADMIN', 'LEADER', 'MANAGER'] },
  { href: '/users', label: 'Xodimlar', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'LEADER'] },
  { href: '/departments', label: 'Bo‘limlar', icon: Building2, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'LEADER'] },
  { href: '/organizations', label: 'Tashkilotlar', icon: Landmark, roles: ['SUPER_ADMIN'] },
  { href: '/categories', label: 'Kategoriyalar', icon: FolderKanban, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/audit', label: 'Audit jurnal', icon: ScrollText, roles: ['SUPER_ADMIN', 'ADMIN', 'LEADER'] },
  { href: '/settings', label: 'Sozlamalar', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN', 'LEADER'] },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
            <Landmark size={18} />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">Smart Murojaat</div>
            <div className="text-[10px] text-slate-500">AI boshqaruv paneli</div>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {NAV.filter((n) => !n.roles || (user && n.roles.includes(user.role))).map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [showProfile, setShowProfile] = useState(false);

  const loadNotifs = () => {
    api('/notifications?limit=8')
      .then((r) => {
        setNotifs(r.data);
        setUnread(r.unreadCount);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadNotifs();
    const t = setInterval(loadNotifs, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4">
      <button onClick={onMenu} className="rounded p-2 hover:bg-slate-100 lg:hidden">
        <Menu size={20} />
      </button>
      <div className="hidden text-sm text-slate-500 lg:block">
        {user?.organization?.name ?? 'Smart Murojaat AI'}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => {
              setShowNotif(!showNotif);
              setShowProfile(false);
            }}
            className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <Bell size={19} />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          {showNotif && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                <span className="text-sm font-semibold">Bildirishnomalar</span>
                <button
                  className="text-xs text-primary-600 hover:underline"
                  onClick={() => {
                    api('/notifications/read-all', { method: 'PATCH' }).then(loadNotifs);
                  }}
                >
                  Hammasini o‘qish
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 && (
                  <p className="p-4 text-center text-sm text-slate-400">Bildirishnoma yo‘q</p>
                )}
                {notifs.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'cursor-pointer border-b border-slate-50 px-4 py-2.5 hover:bg-slate-50',
                      !n.isRead && 'bg-primary-50/50',
                    )}
                    onClick={() => {
                      api(`/notifications/${n.id}/read`, { method: 'PATCH' }).then(loadNotifs);
                      if (n.meta?.appealId) router.push(`/appeals/${n.meta.appealId}`);
                      setShowNotif(false);
                    }}
                  >
                    <div className="text-sm font-medium">{n.title}</div>
                    <div className="line-clamp-2 text-xs text-slate-500">{n.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotif(false);
            }}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white">
              {user?.fullName?.[0] ?? '?'}
            </div>
            <div className="hidden text-left sm:block">
              <div className="text-sm font-medium leading-tight">{user?.fullName}</div>
              <div className="text-[11px] text-slate-500">
                {user ? (ROLE_LABELS_UZ as any)[user.role] : ''}
              </div>
            </div>
          </button>
          {showProfile && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              <button
                onClick={async () => {
                  await logout();
                  router.push('/login');
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={15} /> Chiqish
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <RequireAuth>
      <div className="flex min-h-screen">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setMenuOpen(true)} />
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}
