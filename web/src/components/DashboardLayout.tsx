'use client';

import ThemeToggle from './ThemeToggle';
import { useAuth } from '@/lib/useAuth';
import { useRouter } from 'next/navigation';

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Student',
  PROFESSOR: 'Professor',
  CLUB_MANAGER: 'Club Manager',
  LAB_TECH: 'Lab Technician',
  LHC: 'LHC Manager',
  ADMIN: 'Admin',
};

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export default function DashboardLayout({
  title,
  subtitle,
  action,
  children,
}: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-zinc-950">
      {/* Top navbar */}
      <header className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-950">
        <div>
          <h1 className="text-base font-semibold text-zinc-100">{title}</h1>
          {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user && (
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-zinc-300">{user.name}</p>
                <p className="text-[11px] text-zinc-500">{ROLE_LABELS[user.role] ?? user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100 border border-zinc-700 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
          {action && <div>{action}</div>}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {children}
      </div>
    </div>
  );
}
